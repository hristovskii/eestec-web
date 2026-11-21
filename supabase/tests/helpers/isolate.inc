-- Tests use their own fixtures. Clear seeded public rows only inside the surrounding transaction;
-- disabling triggers is safe here because the transaction always rolls back at the end of a test.
set local session_replication_role = replica;
do $$
declare r record;
begin
  for r in select tablename from pg_catalog.pg_tables where schemaname = 'public' order by tablename loop
    execute format('delete from public.%I',r.tablename);
  end loop;
end $$;
delete from auth.users where raw_app_meta_data->>'is_sample' = 'true';
set local session_replication_role = origin;
