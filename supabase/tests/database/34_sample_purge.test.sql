-- Purge is all-or-nothing and never destroys a board-edited sample.
begin;
\ir ../helpers/isolate.inc
select plan(15);
insert into auth.users(id,aud,role,email,raw_app_meta_data) values
 ('c0000000-0000-0000-0000-000000000001','authenticated','authenticated','editor@test.mk','{}'),
 ('c0000000-0000-0000-0000-000000000002','authenticated','authenticated','sample@test.mk','{"is_sample":true}'),
 ('c0000000-0000-0000-0000-000000000003','authenticated','authenticated','super@test.mk','{}');
insert into public.admin_roles(user_id,role) values ('c0000000-0000-0000-0000-000000000001','editor'),('c0000000-0000-0000-0000-000000000003','super_admin');
insert into public.profiles(id,username,full_name,status,is_sample) values ('c0000000-0000-0000-0000-000000000002','sample-person','Sample Person','active',true);
insert into public.event_types(id,name,is_sample) values
 ('c1000000-0000-0000-0000-000000000001','{"mk":"Referenced sample"}',true),
 ('c1000000-0000-0000-0000-000000000002','{"mk":"Unreferenced sample"}',true);
insert into public.events(id,slug,title,short_description,scope,type_id,starts_at,ends_at,location,city,country,description,requirements,seo_title,seo_description,status,is_sample)
values ('c2000000-0000-0000-0000-000000000001','real-purge-test','{"mk":"Real"}','{"mk":"Short"}','local','c1000000-0000-0000-0000-000000000001',now(),now()+interval '1 day','{"mk":"Here"}','{"mk":"City"}','{"mk":"MK"}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','published',false);
insert into public.page_content(page,content,is_sample) values ('home','{"title":"Sample"}',true),('journey','{"title":"Sample"}',true);
insert into public.event_topics(id,name,is_sample) values ('c3000000-0000-0000-0000-000000000001','{"mk":"Topic"}',true);
insert into public.events(id,slug,title,short_description,scope,type_id,starts_at,ends_at,location,city,country,description,requirements,seo_title,seo_description,status,is_sample)
values ('c2000000-0000-0000-0000-000000000002','sample-edit-test','{"mk":"Draft"}','{"mk":""}','local','c1000000-0000-0000-0000-000000000002',now(),now()+interval '1 day','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','draft',true);

insert into public.board_mandates(label,starts_on,ends_on,is_sample) values ('sample-test','2024-01-01','2024-12-31',true);
create function pg_temp.act_as(p_uid uuid,p_aal text default 'aal1') returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims',json_build_object('sub',p_uid,'role','authenticated','aal',p_aal)::text,true); set local role authenticated;
end $$;
grant execute on all functions in schema pg_temp to anon,authenticated,service_role;
set local role anon;
select throws_ok($$select public.purge_sample_data()$$,'42501',null,'visitor cannot purge');
select pg_temp.act_as('c0000000-0000-0000-0000-000000000001');
select throws_ok($$select public.purge_sample_data()$$,'42501',null,'an editor cannot purge');
select pg_temp.act_as('c0000000-0000-0000-0000-000000000003');
select throws_ok($$select public.purge_sample_data()$$,'42501',null,'a super admin without 2-step cannot purge');
select pg_temp.act_as('c0000000-0000-0000-0000-000000000003','aal2');
select is(public.purge_sample_data()->>'status','blocked','real event referencing sample type blocks purge');
select is((select count(*)::integer from public.page_content where is_sample),2,'blocked purge leaves all sample pages intact');
update public.event_types set name = '{"mk":"Board edited"}' where id = 'c1000000-0000-0000-0000-000000000001';
update public.page_content set content = '{"title":"Board edited"}' where page = 'home';
select is((select is_sample from public.event_types where id = 'c1000000-0000-0000-0000-000000000001'),false,'board-edited sample type is protected');
select is((select is_sample from public.page_content where page = 'home'),false,'board-edited page is protected');
select is(public.event_save('c2000000-0000-0000-0000-000000000002','{"topic_ids":["c3000000-0000-0000-0000-000000000001"]}')::text,'c2000000-0000-0000-0000-000000000002','board edits a sample event child');
select is((select is_sample from public.events where slug='sample-edit-test'),false,'child edit protects its sample parent');
-- Mark the topic and type as real to resolve the new event's dependencies.
update public.event_topics set name = '{"mk":"Real topic"}' where id = 'c3000000-0000-0000-0000-000000000001';
update public.event_types set name = '{"mk":"Real type"}' where id = 'c1000000-0000-0000-0000-000000000002';

select is(public.purge_sample_data()->>'status','purged','purge succeeds after references are resolved');
select is((select content->>'title' from public.page_content where page = 'home'),'Board edited','board content remains');
select is((select count(*)::integer from public.page_content where page = 'journey'),0,'untouched sample page is removed');
select is((select count(*)::integer from public.events where slug = 'real-purge-test'),1,'real event remains');
reset role;
select is((select count(*)::integer from auth.users where id = 'c0000000-0000-0000-0000-000000000002'),0,'sample Auth user is removed');
-- (activity row checked below)
select is((select count(*)::integer from public.activity_log where target = 'Sample data purged' and actor = 'c0000000-0000-0000-0000-000000000003'),1,'the purge is recorded in the activity log');
select * from finish(); rollback;
