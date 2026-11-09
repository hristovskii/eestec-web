begin;
select plan(24);
insert into auth.users(id,aud,role,email) values
 ('40000000-0000-0000-0000-000000000001','authenticated','authenticated','editor@test.mk'),
 ('40000000-0000-0000-0000-000000000002','authenticated','authenticated','manager@test.mk');
insert into public.admin_roles(user_id,role) values
 ('40000000-0000-0000-0000-000000000001','editor'),('40000000-0000-0000-0000-000000000002','event_manager');
insert into public.contact_subjects(id,name,team_label,route_note,shortcut_label) values
 ('41000000-0000-0000-0000-000000000001','{"mk":"Topic"}','{"mk":"Team"}','{"mk":""}','{"mk":""}');
insert into public.contact_subject_routes(subject_id,route_email) values ('41000000-0000-0000-0000-000000000001','private@test.mk');
insert into public.page_content(page,content) values ('join','{"apply":{"open":true}}');
create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims',json_build_object('sub',p_uid,'role','authenticated','aal','aal1')::text,true); set local role authenticated;
end $$;
create function pg_temp.visitor() returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims','{"role":"anon"}',true); set local role anon;
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select pg_temp.visitor();
select is((select count(*)::integer from public.contact_subjects),1,'visitor can list subjects');
select throws_ok($$select * from public.contact_subject_routes$$,'42501',null,'visitor cannot list route emails');
select throws_ok($$select * from public.contact_messages$$,'42501',null,'visitor cannot read messages');
select throws_ok($$select public.dashboard_counts()$$,'42501',null,'visitor cannot use admin dashboard counts');
select throws_ok($$select public.submit_contact_message('Sender','sender@test.mk','41000000-0000-0000-0000-000000000001','Hello','en',true)$$,'42501',null,'public callers cannot bypass the server spam guard');
reset role;
set local role service_role;
select throws_ok($$select public.submit_contact_message('Sender','sender@test.mk','41000000-0000-0000-0000-000000000001','Hello','en',false)$$,'22023',null,'contact submission requires consent');
select ok(public.submit_contact_message('Sender','sender@test.mk','41000000-0000-0000-0000-000000000001','Hello','en',true) like 'MSG-%','contact returns a reference');
select ok(public.submit_partner_inquiry('Sender','sender@test.mk','Company','123',array['other'],'Hello','en',true) like 'PRT-%','inquiry returns a reference');
select ok(public.submit_membership('Sender','sender@test.mk','','Faculty','','',array[]::text[],'','en',true) like 'MEM-%','membership returns a reference');
select pg_temp.visitor();
select throws_ok($$insert into public.contact_messages(reference,name,subject,routed_to,message,locale) values ('a','b','c','d','e','en')$$,'42501',null,'visitor cannot insert directly');
select pg_temp.act_as('40000000-0000-0000-0000-000000000002');
select is((select count(*)::integer from public.contact_messages),0,'manager sees no inbox messages');
select is((public.dashboard_counts() #>> '{messages,contact}')::integer,0,'manager dashboard does not reveal inbox counts');
select throws_ok($$select public.add_internal_note('contact_message','41000000-0000-0000-0000-000000000001','test')$$,'42501',null,'manager cannot add inbox notes');
select pg_temp.act_as('40000000-0000-0000-0000-000000000001');
select is((select routed_to from public.contact_messages limit 1),'private@test.mk','editor can read the route snapshot');
select is((select count(*)::integer from public.partner_inquiries),1,'editor sees inquiry');
select is((select count(*)::integer from public.membership_applications),1,'editor sees membership application');
select is(public.mark_all_inbox_read('contact_message',now()),1,'editor marks unread messages read');
select is((public.dashboard_counts() #>> '{messages,contact}')::integer,1,'dashboard counts new status independently of read state');
select is(public.mark_all_inbox_read('contact_message',now()),0,'already-read messages are not counted again');
select throws_ok($$delete from public.contact_subjects$$,'42501',null,'subjects cannot be deleted outside the combined save');
select lives_ok($$select public.save_contact_page('{"hero":{}}','[{"id":"41000000-0000-0000-0000-000000000001","name":{"mk":"Topic"},"team_label":{"mk":"Team"},"route_note":{"mk":""},"shortcut_label":{"mk":""},"route_email":"changed@test.mk"}]')$$,'editor atomically saves subject and route');
select is((select route_email from public.contact_subject_routes limit 1),'changed@test.mk','contact routing was updated');
select lives_ok($$select public.save_contact_page('{"hero":{}}','[]')$$,'editor atomically removes contact subjects');
select is((select routed_to from public.contact_messages limit 1),'private@test.mk','removing a subject retains its routing snapshot');
select * from finish(); rollback;
