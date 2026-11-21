-- Runs against the actual generated seed; all mutations are rolled back.
begin;
select plan(10);
select is((select count(*)::integer from public.events),23,'seed contains the 23 fixture events');
select is((select count(*)::integer from public.committees),35,'seed contains the 35 fixture committees');
select is((select count(*)::integer from public.sponsors),20,'seed contains the 20 fixture sponsors');
select is((select count(*)::integer from public.contact_messages),7,'seed contains the 7 fixture messages');
select is((select count(*)::integer from public.applications),193,'seed contains the base application batches');
select is((select count(*)::integer from auth.users where raw_app_meta_data->>'is_sample' = 'true' and email not like 'sample+%@example.invalid'),0,'no sample account has a real-looking e-mail address');
create function pg_temp.sample_count() returns integer language plpgsql security definer set search_path = '' as $$
declare r record; total integer := 0; n integer;
begin
  for r in select table_name from information_schema.columns where table_schema = 'public' and column_name = 'is_sample' loop
    execute format('select count(*) from public.%I where is_sample',r.table_name) into n;
    total := total + n;
  end loop;
  return total;
end $$;
grant execute on all functions in schema pg_temp to authenticated;
select set_config('request.jwt.claims', json_build_object('sub',(select user_id from public.admin_roles where role = 'super_admin' limit 1),'role','authenticated','aal','aal2')::text,true);
set local role authenticated;
select is(public.purge_sample_data()->>'status','purged','full fixture seed can be purged');
reset role;
select is(pg_temp.sample_count(),0,'purge leaves no flagged sample rows');
select is((select count(*)::integer from public.media where not is_sample and public_path like '/brand/%'),3,'shipped brand media survive');
select is((select count(*)::integer from auth.users where raw_app_meta_data->>'is_sample' = 'true'),0,'sample Auth users are purged');
select * from finish(); rollback;
