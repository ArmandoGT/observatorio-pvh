-- Dados de ingestão privados. O site público continua consumindo o JSON exportado.
create schema if not exists observatory;
revoke all on schema observatory from public, anon, authenticated;
grant usage on schema observatory to service_role;

create table observatory.ingestion_runs (
  id uuid primary key,
  module text not null,
  kind text not null check (kind in ('seed', 'sync')),
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  status text not null check (status in ('ok', 'partial', 'error')),
  error text,
  revision bigint not null,
  snapshot jsonb not null,
  raw_works jsonb,
  unique (module, revision)
);

create table observatory.module_state (
  module text primary key,
  revision bigint not null check (revision > 0),
  snapshot jsonb not null,
  contracts jsonb not null,
  latest_run_id uuid not null references observatory.ingestion_runs(id),
  last_successful_run_id uuid references observatory.ingestion_runs(id)
);

create table observatory.sources (
  module text not null,
  source_key text not null,
  data jsonb not null,
  run_id uuid not null references observatory.ingestion_runs(id),
  primary key (module, source_key)
);

create table observatory.works (
  module text not null,
  id text not null,
  source_record_id bigint not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  contracted_cents bigint check (contracted_cents >= 0),
  paid_cents bigint check (paid_cents >= 0),
  in_latest_snapshot boolean not null,
  data jsonb not null,
  run_id uuid not null references observatory.ingestion_runs(id),
  primary key (module, id),
  unique (module, source_record_id)
);

create table observatory.work_versions (
  module text not null,
  work_id text not null,
  run_id uuid not null references observatory.ingestion_runs(id),
  content_hash text not null,
  recorded_at timestamptz not null default now(),
  data jsonb not null,
  primary key (module, work_id, run_id)
);
create index work_versions_history on observatory.work_versions (module, work_id, recorded_at desc);

create table observatory.contracts (
  module text not null,
  source_record_id bigint not null,
  data jsonb not null,
  run_id uuid not null references observatory.ingestion_runs(id),
  primary key (module, source_record_id)
);

alter table observatory.ingestion_runs enable row level security;
alter table observatory.module_state enable row level security;
alter table observatory.sources enable row level security;
alter table observatory.works enable row level security;
alter table observatory.work_versions enable row level security;
alter table observatory.contracts enable row level security;
revoke all on all tables in schema observatory from public, anon, authenticated;
grant select, insert, update on all tables in schema observatory to service_role;

create function public.observatory_load_state(p_module text)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object('revision', revision, 'snapshot', snapshot, 'contracts', contracts)
      from observatory.module_state where module = p_module),
    jsonb_build_object('revision', 0, 'snapshot', null, 'contracts', '{}'::jsonb)
  );
$$;

create function public.observatory_save_snapshot(
  p_module text, p_expected_revision bigint, p_run_id uuid,
  p_kind text, p_started_at timestamptz, p_snapshot jsonb,
  p_contracts jsonb, p_raw_works jsonb default null
)
returns bigint language plpgsql security invoker set search_path = ''
as $$
declare
  current_revision bigint;
  next_revision bigint;
  previous_run observatory.ingestion_runs%rowtype;
  current_state observatory.module_state%rowtype;
  work jsonb;
  old_work observatory.works%rowtype;
  source jsonb;
  contract record;
  status text := p_snapshot->>'syncStatus';
begin
  if p_module is null or p_module !~ '^[a-z][a-z0-9-]{0,63}$'
    or p_expected_revision is null or p_expected_revision < 0
    or p_kind not in ('seed', 'sync') or p_kind is null
    or p_run_id is null or p_started_at is null then
    raise exception 'Invalid ingestion parameters';
  end if;
  -- A gravação inteira é atômica; a revisão evita que uma coleta antiga sobrescreva outra.
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
    raise exception 'Snapshot revision conflict' using errcode = '40001';
  end if;
  if (p_snapshot->>'schemaVersion') is distinct from '1'
    or status is null or status not in ('ok', 'partial', 'error')
    or jsonb_typeof(p_snapshot->'works') is distinct from 'array'
    or jsonb_typeof(p_snapshot->'sources') is distinct from 'array'
    or jsonb_typeof(p_contracts) is distinct from 'object' then
    raise exception 'Invalid snapshot';
  end if;
  if p_kind = 'seed' and (current_revision <> 0 or status = 'error') then
    raise exception 'Seed requires an empty module and a valid snapshot';
  end if;
  if status = 'error' then
    if current_revision = 0
      or p_snapshot->'works' is distinct from current_state.snapshot->'works'
      or p_snapshot->'generatedAt' is distinct from current_state.snapshot->'generatedAt'
      or p_contracts is distinct from current_state.contracts then
      raise exception 'Failed ingestion must preserve the previous data';
    end if;
  else
    if (select count(*) <> count(distinct w->>'id')
      or count(*) <> count(distinct w->>'sourceId')
      from jsonb_array_elements(p_snapshot->'works') w) then
      raise exception 'Duplicate work IDs';
    end if;
    if (p_snapshot->>'sourceTotal')::bigint is distinct from
      (select count(*) from jsonb_array_elements(p_snapshot->'works') w
        where (w->>'inLatestSnapshot')::boolean) then
      raise exception 'Incomplete snapshot';
    end if;
    if current_revision > 0 and exists (
      select 1 from observatory.works old where old.module = p_module
      and not exists (select 1 from jsonb_array_elements(p_snapshot->'works') w
        where w->>'id' = old.id)
    ) then
      raise exception 'Previously known works must be retained';
    end if;
  end if;
  next_revision := current_revision + 1;
  insert into observatory.ingestion_runs
    (id, module, kind, started_at, status, error, revision, snapshot, raw_works)
  values (p_run_id, p_module, p_kind, p_started_at, status,
    p_snapshot->>'syncError', next_revision, p_snapshot, p_raw_works);

  if status <> 'error' then
    for work in select value from jsonb_array_elements(p_snapshot->'works') loop
      select * into old_work from observatory.works
        where module = p_module and id = work->>'id';
      if not found or old_work.content_hash <> work->>'contentHash'
        or old_work.in_latest_snapshot <> (work->>'inLatestSnapshot')::boolean then
        insert into observatory.work_versions (module, work_id, run_id, content_hash, data)
        values (p_module, work->>'id', p_run_id, work->>'contentHash', work);
      end if;
      insert into observatory.works
        (module, id, source_record_id, content_hash, contracted_cents, paid_cents,
          in_latest_snapshot, data, run_id)
      values (p_module, work->>'id', (work->>'sourceId')::bigint,
        work->>'contentHash', (work->>'contractedCents')::bigint,
        (work->>'paidCents')::bigint, (work->>'inLatestSnapshot')::boolean, work, p_run_id)
      on conflict (module, id) do update set
        content_hash = excluded.content_hash, contracted_cents = excluded.contracted_cents,
        paid_cents = excluded.paid_cents, in_latest_snapshot = excluded.in_latest_snapshot,
        data = excluded.data, run_id = excluded.run_id;
    end loop;
    for contract in select key, value from jsonb_each(p_contracts) loop
      insert into observatory.contracts (module, source_record_id, data, run_id)
      values (p_module, contract.key::bigint, contract.value, p_run_id)
      on conflict (module, source_record_id) do update set data = excluded.data, run_id = excluded.run_id;
    end loop;
  end if;
  for source in select value from jsonb_array_elements(p_snapshot->'sources') loop
    insert into observatory.sources (module, source_key, data, run_id)
    values (p_module, source->>'id', source, p_run_id)
    on conflict (module, source_key) do update set data = excluded.data, run_id = excluded.run_id;
  end loop;
  insert into observatory.module_state
    (module, revision, snapshot, contracts, latest_run_id, last_successful_run_id)
  values (p_module, next_revision, p_snapshot, p_contracts, p_run_id,
    case when status <> 'error' then p_run_id else current_state.last_successful_run_id end)
  on conflict (module) do update set revision = excluded.revision,
    snapshot = excluded.snapshot, contracts = excluded.contracts,
    latest_run_id = excluded.latest_run_id,
    last_successful_run_id = excluded.last_successful_run_id;
  return next_revision;
end;
$$;

revoke all on function public.observatory_load_state(text) from public, anon, authenticated;
revoke all on function public.observatory_save_snapshot(text,bigint,uuid,text,timestamptz,jsonb,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.observatory_load_state(text) to service_role;
grant execute on function public.observatory_save_snapshot(text,bigint,uuid,text,timestamptz,jsonb,jsonb,jsonb)
  to service_role;
