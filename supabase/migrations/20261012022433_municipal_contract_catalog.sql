-- Catálogo municipal de contratos: estado isolado de obras-pvh.
create table observatory.contract_catalog (
  module text not null,
  id text not null,
  source_record_id bigint not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  in_latest_snapshot boolean not null,
  data jsonb not null,
  run_id uuid not null references observatory.ingestion_runs(id),
  primary key (module, id),
  unique (module, source_record_id)
);
create table observatory.contract_versions (
  module text not null,
  contract_id text not null,
  run_id uuid not null references observatory.ingestion_runs(id),
  content_hash text not null,
  recorded_at timestamptz not null default now(),
  data jsonb not null,
  primary key (module, contract_id, run_id)
);
create index contract_versions_history on observatory.contract_versions (module, contract_id, recorded_at desc);
alter table observatory.contract_catalog enable row level security;
alter table observatory.contract_versions enable row level security;
revoke all on observatory.contract_catalog, observatory.contract_versions from public, anon, authenticated;
grant select, insert, update on observatory.contract_catalog, observatory.contract_versions to service_role;

create function public.observatory_save_contract_snapshot(
  p_module text, p_expected_revision bigint, p_run_id uuid,
  p_kind text, p_started_at timestamptz, p_snapshot jsonb
) returns bigint language plpgsql security invoker set search_path = ''
as $$
declare
  current_revision bigint;
  next_revision bigint;
  previous_run observatory.ingestion_runs%rowtype;
  current_state observatory.module_state%rowtype;
  item jsonb;
  old_item observatory.contract_catalog%rowtype;
  source jsonb;
  status text := p_snapshot->>'syncStatus';
begin
  if p_module is distinct from 'contratos-pvh'
    or p_expected_revision is null or p_expected_revision < 0
    or p_kind is null or p_kind not in ('seed', 'sync')
    or p_run_id is null or p_started_at is null then
    raise exception 'Invalid contract ingestion parameters';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_module, 0));
  select * into previous_run from observatory.ingestion_runs where id = p_run_id;
  if found then
    if previous_run.module <> p_module or previous_run.kind <> p_kind
      or previous_run.snapshot <> p_snapshot then
      raise exception 'Run ID already used with another payload';
    end if;
    return previous_run.revision;
  end if;
  select * into current_state from observatory.module_state where module = p_module;
  current_revision := coalesce(current_state.revision, 0);
  if current_revision <> p_expected_revision then
    raise exception 'Contract snapshot revision conflict' using errcode = '40001';
  end if;
  if (p_snapshot->>'schemaVersion') is distinct from '1'
    or status is null or status not in ('ok', 'error')
    or jsonb_typeof(p_snapshot->'contracts') is distinct from 'array'
    or jsonb_typeof(p_snapshot->'sources') is distinct from 'array'
    or p_snapshot->>'generatedAt' is null then
    raise exception 'Invalid contract snapshot';
  end if;
  if p_kind = 'seed' and (current_revision <> 0 or status <> 'ok') then
    raise exception 'Seed requires an empty contract module and valid snapshot';
  end if;
  if status = 'error' then
    if current_revision = 0
      or p_snapshot->'contracts' is distinct from current_state.snapshot->'contracts'
      or p_snapshot->'generatedAt' is distinct from current_state.snapshot->'generatedAt'
      or p_snapshot->'sourceTotal' is distinct from current_state.snapshot->'sourceTotal' then
      raise exception 'Failed contract ingestion must preserve previous data';
    end if;
  else
    if (select count(*) <> count(distinct c->>'id')
      or count(*) <> count(distinct c->>'sourceId')
      from jsonb_array_elements(p_snapshot->'contracts') c) then
      raise exception 'Duplicate contract IDs';
    end if;
    if (p_snapshot->>'sourceTotal')::bigint is distinct from
      (select count(*) from jsonb_array_elements(p_snapshot->'contracts') c
       where (c->>'inLatestSnapshot')::boolean) then
      raise exception 'Incomplete contract snapshot';
    end if;
    if current_revision > 0 and exists (
      select 1 from observatory.contract_catalog old where old.module = p_module
      and not exists (select 1 from jsonb_array_elements(p_snapshot->'contracts') c where c->>'id' = old.id)
    ) then
      raise exception 'Previously known contracts must be retained';
    end if;
  end if;
  next_revision := current_revision + 1;
  insert into observatory.ingestion_runs
    (id, module, kind, started_at, status, error, revision, snapshot)
  values (p_run_id, p_module, p_kind, p_started_at, status,
    p_snapshot->>'syncError', next_revision, p_snapshot);
  if status = 'ok' then
    for item in select value from jsonb_array_elements(p_snapshot->'contracts') loop
      select * into old_item from observatory.contract_catalog where module = p_module and id = item->>'id';
      if not found or old_item.content_hash <> item->>'contentHash'
        or old_item.in_latest_snapshot <> (item->>'inLatestSnapshot')::boolean then
        insert into observatory.contract_versions (module, contract_id, run_id, content_hash, data)
        values (p_module, item->>'id', p_run_id, item->>'contentHash', item);
      end if;
      insert into observatory.contract_catalog (module, id, source_record_id, content_hash, in_latest_snapshot, data, run_id)
      values (p_module, item->>'id', (item->>'sourceId')::bigint, item->>'contentHash',
        (item->>'inLatestSnapshot')::boolean, item, p_run_id)
      on conflict (module, id) do update set content_hash = excluded.content_hash,
        in_latest_snapshot = excluded.in_latest_snapshot, data = excluded.data, run_id = excluded.run_id;
    end loop;
  end if;
  for source in select value from jsonb_array_elements(p_snapshot->'sources') loop
    insert into observatory.sources (module, source_key, data, run_id)
    values (p_module, source->>'id', source, p_run_id)
    on conflict (module, source_key) do update set data = excluded.data, run_id = excluded.run_id;
  end loop;
  insert into observatory.module_state (module, revision, snapshot, contracts, latest_run_id, last_successful_run_id)
  values (p_module, next_revision, p_snapshot, '{}'::jsonb, p_run_id,
    case when status = 'ok' then p_run_id else current_state.last_successful_run_id end)
  on conflict (module) do update set revision = excluded.revision, snapshot = excluded.snapshot,
    latest_run_id = excluded.latest_run_id, last_successful_run_id = excluded.last_successful_run_id;
  return next_revision;
end;
$$;
revoke all on function public.observatory_save_contract_snapshot(text,bigint,uuid,text,timestamptz,jsonb)
  from public, anon, authenticated;
grant execute on function public.observatory_save_contract_snapshot(text,bigint,uuid,text,timestamptz,jsonb) to service_role;
