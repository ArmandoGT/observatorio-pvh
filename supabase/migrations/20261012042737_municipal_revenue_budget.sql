-- Resumos de receitas: histórico por chave contábil, sem dados pessoais.
create table observatory.revenue_entries (
  module text not null,
  id text not null,
  year integer not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  in_latest_snapshot boolean not null,
  data jsonb not null,
  run_id uuid not null references observatory.ingestion_runs(id),
  primary key (module, id)
);
create table observatory.revenue_versions (
  module text not null,
  entry_id text not null,
  run_id uuid not null references observatory.ingestion_runs(id),
  content_hash text not null,
  data jsonb not null,
  recorded_at timestamptz not null default now(),
  primary key (module, entry_id, run_id)
);
create index revenue_versions_history on observatory.revenue_versions (module, entry_id, recorded_at desc);
alter table observatory.revenue_entries enable row level security;
alter table observatory.revenue_versions enable row level security;
revoke all on observatory.revenue_entries, observatory.revenue_versions from public, anon, authenticated;
grant select, insert, update on observatory.revenue_entries, observatory.revenue_versions to service_role;

create function public.observatory_save_revenue_snapshot(
  p_module text, p_expected_revision bigint, p_run_id uuid,
  p_started_at timestamptz, p_snapshot jsonb
) returns bigint language plpgsql security invoker set search_path = ''
as $$
declare
  current_state observatory.module_state%rowtype;
  previous_run observatory.ingestion_runs%rowtype;
  old_entry observatory.revenue_entries%rowtype;
  item jsonb;
  source jsonb;
  stats jsonb;
  status text := p_snapshot->>'syncStatus';
  run_summary jsonb := (p_snapshot - 'entries') || jsonb_build_object('entriesHash', pg_catalog.md5((p_snapshot->'entries')::text));
  current_revision bigint;
  next_revision bigint;
begin
  if p_module is distinct from 'receitas-pvh' or p_expected_revision is null
    or p_expected_revision < 0 or p_run_id is null or p_started_at is null then
    raise exception 'Invalid revenue ingestion parameters';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_module, 0));
  select * into previous_run from observatory.ingestion_runs where id = p_run_id;
  if found then
    if previous_run.module <> p_module or previous_run.snapshot is distinct from run_summary then
      raise exception 'Run ID already used with another payload';
    end if;
    return previous_run.revision;
  end if;
  select * into current_state from observatory.module_state where module = p_module;
  current_revision := coalesce(current_state.revision, 0);
  if current_revision <> p_expected_revision then
    raise exception 'Revenue snapshot revision conflict' using errcode = '40001';
  end if;
  if (p_snapshot->>'schemaVersion') is distinct from '1' or (p_snapshot->>'portalId') is distinct from '12535'
    or status is null or status not in ('ok','error') or p_snapshot->>'generatedAt' is null
    or jsonb_typeof(p_snapshot->'entries') is distinct from 'array'
    or jsonb_typeof(p_snapshot->'years') is distinct from 'array'
    or jsonb_typeof(p_snapshot->'sources') is distinct from 'array' then
    raise exception 'Invalid revenue snapshot';
  end if;
  if status = 'error' then
    if current_revision = 0 or p_snapshot->'entries' is distinct from current_state.snapshot->'entries'
      or p_snapshot->'years' is distinct from current_state.snapshot->'years'
      or p_snapshot->'generatedAt' is distinct from current_state.snapshot->'generatedAt' then
      raise exception 'Failed revenue ingestion must preserve previous data';
    end if;
  else
    if (select count(*) <> count(distinct e->>'id') from jsonb_array_elements(p_snapshot->'entries') e) then
      raise exception 'Duplicate revenue entry IDs';
    end if;
    if current_revision > 0 and exists (select 1 from observatory.revenue_entries old where old.module = p_module
      and not exists (select 1 from jsonb_array_elements(p_snapshot->'entries') e where e->>'id' = old.id)) then
      raise exception 'Previously known revenue entries must be retained';
    end if;
    for stats in select value from jsonb_array_elements(p_snapshot->'years') loop
      if (stats->>'planned')::bigint is distinct from
        (select coalesce(sum((e->>'plannedLines')::bigint),0) from jsonb_array_elements(p_snapshot->'entries') e
          where (e->>'year')::integer = (stats->>'year')::integer and (e->>'inLatestSnapshot')::boolean)
        or (stats->>'receipts')::bigint is distinct from
        (select coalesce(sum((m->>'documents')::bigint),0) from jsonb_array_elements(p_snapshot->'entries') e,
          lateral jsonb_array_elements(e->'months') m
          where (e->>'year')::integer = (stats->>'year')::integer and (e->>'inLatestSnapshot')::boolean) then
        raise exception 'Incomplete revenue snapshot';
      end if;
    end loop;
  end if;
  next_revision := current_revision + 1;
  insert into observatory.ingestion_runs (id,module,kind,started_at,status,error,revision,snapshot)
    values (p_run_id,p_module,'sync',p_started_at,status,p_snapshot->>'syncError',next_revision,run_summary);
  if status = 'ok' then
    for item in select value from jsonb_array_elements(p_snapshot->'entries') loop
      select * into old_entry from observatory.revenue_entries where module = p_module and id = item->>'id';
      if not found or old_entry.content_hash <> item->>'contentHash'
        or old_entry.in_latest_snapshot <> (item->>'inLatestSnapshot')::boolean then
        insert into observatory.revenue_versions (module,entry_id,run_id,content_hash,data)
          values (p_module,item->>'id',p_run_id,item->>'contentHash',item);
      end if;
      insert into observatory.revenue_entries (module,id,year,content_hash,in_latest_snapshot,data,run_id)
        values (p_module,item->>'id',(item->>'year')::integer,item->>'contentHash',(item->>'inLatestSnapshot')::boolean,item,p_run_id)
        on conflict (module,id) do update set content_hash = excluded.content_hash,
          in_latest_snapshot = excluded.in_latest_snapshot, data = excluded.data, run_id = excluded.run_id;
    end loop;
  end if;
  for source in select value from jsonb_array_elements(p_snapshot->'sources') loop
    insert into observatory.sources (module,source_key,data,run_id) values (p_module,source->>'id',source,p_run_id)
      on conflict (module,source_key) do update set data = excluded.data, run_id = excluded.run_id;
  end loop;
  insert into observatory.module_state (module,revision,snapshot,contracts,latest_run_id,last_successful_run_id)
    values (p_module,next_revision,p_snapshot,'{}'::jsonb,p_run_id,
      case when status = 'ok' then p_run_id else current_state.last_successful_run_id end)
    on conflict (module) do update set revision = excluded.revision,snapshot = excluded.snapshot,
      latest_run_id = excluded.latest_run_id,last_successful_run_id = excluded.last_successful_run_id;
  return next_revision;
end;
$$;
revoke all on function public.observatory_save_revenue_snapshot(text,bigint,uuid,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.observatory_save_revenue_snapshot(text,bigint,uuid,timestamptz,jsonb) to service_role;
