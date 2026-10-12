revoke create on schema public from public;
grant usage on schema public, observatory to observatory_reader, observatory_ingestor;
grant select on observatory.module_state to observatory_reader;
create policy observatory_site_read on observatory.module_state
  for select to observatory_reader using (true);

grant select, insert, update on all tables in schema observatory to observatory_ingestor;
do $$
declare item record;
begin
  for item in select tablename from pg_catalog.pg_tables where schemaname='observatory' and tablename <> 'schema_migrations' loop
    execute format('create policy observatory_ingestion on observatory.%I for all to observatory_ingestor using (true) with check (true)', item.tablename);
  end loop;
  if to_regclass('observatory.schema_migrations') is not null then
    revoke all on observatory.schema_migrations from observatory_ingestor;
  end if;
end;
$$;

grant execute on function public.observatory_load_state(text)
  to observatory_reader, observatory_ingestor;
grant execute on function public.observatory_save_snapshot(text,bigint,uuid,text,timestamptz,jsonb,jsonb,jsonb)
  to observatory_ingestor;
grant execute on function public.observatory_save_contract_snapshot(text,bigint,uuid,text,timestamptz,jsonb)
  to observatory_ingestor;
grant execute on function public.observatory_save_revenue_snapshot(text,bigint,uuid,timestamptz,jsonb)
  to observatory_ingestor;
