-- Event application data is visible only to its applicant, assigned manager, or staff.
begin;
select plan(10);
insert into auth.users(id,aud,role,email,email_confirmed_at) values
 ('60000000-0000-0000-0000-000000000001','authenticated','authenticated','pending@test.mk',now()),
 ('60000000-0000-0000-0000-000000000002','authenticated','authenticated','active@test.mk',now()),
 ('60000000-0000-0000-0000-000000000003','authenticated','authenticated','alumni@test.mk',now()),
 ('60000000-0000-0000-0000-000000000004','authenticated','authenticated','manager@test.mk',now()),
 ('60000000-0000-0000-0000-000000000005','authenticated','authenticated','editor@test.mk',now()),
 ('60000000-0000-0000-0000-000000000006','authenticated','authenticated','super@test.mk',now());
insert into public.profiles(id,username,full_name,status) values
 ('60000000-0000-0000-0000-000000000001','pending-test','Pending Test','pending'),
 ('60000000-0000-0000-0000-000000000002','active-test','Active Test','active'),
 ('60000000-0000-0000-0000-000000000003','alumni-test','Alumni Test','alumni');
insert into public.admin_roles(user_id,role) values
 ('60000000-0000-0000-0000-000000000004','event_manager'),
 ('60000000-0000-0000-0000-000000000005','editor'),
 ('60000000-0000-0000-0000-000000000006','super_admin');
insert into public.event_types(id,name) values ('61000000-0000-0000-0000-000000000001','{"mk":"Workshop"}');
insert into public.events(id,slug,title,short_description,scope,type_id,starts_at,ends_at,location,city,country,description,requirements,seo_title,seo_description,status)
values ('62000000-0000-0000-0000-000000000001','role-test','{"mk":"Test"}','{"mk":"Short"}','local','61000000-0000-0000-0000-000000000001',now()+interval '1 day',now()+interval '2 days','{"mk":"Here"}','{"mk":"City"}','{"mk":"MK"}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','published');
insert into public.event_managers(event_id,user_id) values ('62000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000004');
insert into public.applications(event_id,reference,name,email,status,locale) values
 ('62000000-0000-0000-0000-000000000001','TST-0001','Active','active@test.mk','accepted','en'),
 ('62000000-0000-0000-0000-000000000001','TST-0002','Other','other@test.mk','pending','en');
create function pg_temp.act_as(p_uid uuid,p_aal text default 'aal1') returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims',json_build_object('sub',p_uid,'role','authenticated','aal',p_aal)::text,true); set local role authenticated;
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

set local role anon;
select throws_ok($$select * from public.applications$$,'42501',null,'visitor cannot read applications');
select pg_temp.act_as('60000000-0000-0000-0000-000000000001');
select is((select count(*)::integer from public.applications),0,'pending member cannot see others applications');
select pg_temp.act_as('60000000-0000-0000-0000-000000000002');
select is((select count(*)::integer from public.applications),1,'active member sees only their own application');
select pg_temp.act_as('60000000-0000-0000-0000-000000000003');
select is((select count(*)::integer from public.applications),0,'alumni cannot see others applications');
select pg_temp.act_as('60000000-0000-0000-0000-000000000004');
select is((select count(*)::integer from public.applications),2,'assigned manager sees applications');
select pg_temp.act_as('60000000-0000-0000-0000-000000000005');
select is((select count(*)::integer from public.applications),2,'editor sees applications');
select pg_temp.act_as('60000000-0000-0000-0000-000000000006');
select is((select count(*)::integer from public.applications),0,'super admin without MFA cannot see applications');
select throws_ok($$select public.set_application_status('62000000-0000-0000-0000-000000000001',array[]::uuid[],'accepted')$$,'42501',null,'super admin without MFA cannot manage applications');
select pg_temp.act_as('60000000-0000-0000-0000-000000000006','aal2');
select is((select count(*)::integer from public.applications),2,'super admin with MFA sees applications');
select lives_ok($$select public.set_application_status('62000000-0000-0000-0000-000000000001',array[]::uuid[],'accepted')$$,'super admin with MFA can manage applications');
select * from finish(); rollback;
