-- Functions added while building the Supabase repositories (M20): who may call them and what they return.
begin;
\ir ../helpers/isolate.inc
select plan(4);
insert into auth.users(id,aud,role,email) values
 ('a1000000-0000-0000-0000-000000000001','authenticated','authenticated','editor@test.mk'),
 ('a1000000-0000-0000-0000-000000000002','authenticated','authenticated','manager@test.mk'),
 ('a1000000-0000-0000-0000-000000000003','authenticated','authenticated','member@test.mk');
insert into public.admin_roles(user_id,role,display_name) values
 ('a1000000-0000-0000-0000-000000000001','editor','Edi Editor'),
 ('a1000000-0000-0000-0000-000000000002','event_manager','Mia Manager');
create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims',json_build_object('sub',p_uid,'role','authenticated','aal','aal1')::text,true); set local role authenticated;
end $$;
create function pg_temp.visitor() returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims','{"role":"anon"}',true); set local role anon;
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

-- media_uploaders
select pg_temp.visitor();
select throws_ok($$select * from public.media_uploaders(array['a1000000-0000-0000-0000-000000000001']::uuid[])$$,'42501',null,'visitors cannot ask who uploaded');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000001');
select is((select count(*)::integer from public.media_uploaders(array['a1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003']::uuid[])),3,'staff see every uploader');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000002');
select is((select name from public.media_uploaders(array['a1000000-0000-0000-0000-000000000002']::uuid[])),'Mia Manager','a manager sees their own name');
select is((select count(*)::integer from public.media_uploaders(array['a1000000-0000-0000-0000-000000000001']::uuid[])),0,'a manager does not see other uploaders');
select * from finish();
rollback;
