-- Every table in `public` has row-level security, and the public roles hold no write grants on the
-- tables that are meant to be reached only through functions or the service role.
begin;
select plan(4);

select is(
  (select count(*)::integer from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and not c.relrowsecurity),
  0,
  'row-level security is enabled on every table in public'
);

select is(
  (select count(*)::integer from information_schema.table_privileges
    where table_schema = 'public' and grantee = 'anon' and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')),
  0,
  'anon has no write privilege on any table'
);

select is(
  (select count(*)::integer from information_schema.table_privileges
    where table_schema = 'public' and grantee in ('anon', 'authenticated') and privilege_type = 'TRUNCATE'),
  0,
  'nobody but the service role can truncate'
);

select is(
  (select count(*)::integer from information_schema.table_privileges
    where table_schema = 'public' and grantee in ('anon', 'authenticated')
      and table_name in ('auth_links', 'login_lockouts', 'mfa_backup_codes', 'storage_cleanup_queue')),
  0,
  'link, lockout, backup-code and cleanup tables are for the service role only'
);

select * from finish();
rollback;
