-- Account deletion is durable, anonymizes retained records, and waits for Storage/Auth.
begin;
\ir ../helpers/isolate.inc
select plan(20);
insert into auth.users(id,aud,role,email,email_confirmed_at) values
 ('a0000000-0000-0000-0000-000000000001','authenticated','authenticated','member@test.mk',now()),
 ('a0000000-0000-0000-0000-000000000002','authenticated','authenticated','admin@test.mk',now());
insert into public.profiles(id,username,full_name,status) values ('a0000000-0000-0000-0000-000000000001','delete-test','Delete Test','active');
insert into public.member_accounts(profile_id,data_consent_at) values ('a0000000-0000-0000-0000-000000000001',now());
insert into public.admin_roles(user_id,role) values ('a0000000-0000-0000-0000-000000000002','editor');
insert into public.memories(id,author_id,slug,status,title,body,published_at) values
 ('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','kept-memory','published','Title','Body',now()),
 ('a1000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001',null,'draft','Draft','Body',null);
insert into public.idea_types(id,name) values ('a2000000-0000-0000-0000-000000000001','{"mk":"Idea"}');
insert into public.ideas(reference,type_id,title,description,locale,name,email,user_id) values
 ('DEL-01','a2000000-0000-0000-0000-000000000001','Idea','Description','en','Member','member@test.mk','a0000000-0000-0000-0000-000000000001');
insert into public.feedback(reference,event_title,locale,name,email,user_id) values
 ('DEL-02','Event','en','Member','member@test.mk','a0000000-0000-0000-0000-000000000001');
insert into public.event_types(id,name) values ('a3000000-0000-0000-0000-000000000001','{"mk":"Type"}');
insert into public.events(id,slug,title,short_description,scope,type_id,starts_at,ends_at,location,city,country,description,requirements,seo_title,seo_description,status,applications_enabled,max_participants,waitlist,deadline)
values ('a3000000-0000-0000-0000-000000000002','waitlist-event','{"mk":"Event"}','{"mk":"Short"}','local','a3000000-0000-0000-0000-000000000001',now()+interval '2 days',now()+interval '3 days','{"mk":"Here"}','{"mk":"City"}','{"mk":"MK"}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','published',true,1,true,now()+interval '1 day');
insert into public.applications(event_id,reference,name,email,status,waitlist_position,locale,profile_id) values
 ('a3000000-0000-0000-0000-000000000002','WAI-0001','Member','member@test.mk','waitlist',1,'en','a0000000-0000-0000-0000-000000000001'),
 ('a3000000-0000-0000-0000-000000000002','WAI-0002','Other','other@test.mk','waitlist',2,'en',null);
insert into public.media(id,bucket,path,kind,file_name,uploaded_by) values ('a4000000-0000-0000-0000-000000000001','memory-photos','delete-test/kept.jpg','image','kept.jpg','a0000000-0000-0000-0000-000000000001');
update public.memories set cover_media_id = 'a4000000-0000-0000-0000-000000000001' where slug = 'kept-memory';
insert into storage.objects(bucket_id,name,owner_id,owner) values ('memory-photos','delete-test/kept.jpg','a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001');
insert into public.cv_export_log(sponsor_name,profile_id) values ('Partner','a0000000-0000-0000-0000-000000000001');
insert into storage.objects(bucket_id,name,owner_id,owner) values ('avatars','delete-test/avatar.jpg','a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001');
create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims',json_build_object('sub',p_uid,'role','authenticated','aal','aal1')::text,true); set local role authenticated;
end $$;
grant execute on all functions in schema pg_temp to anon,authenticated,service_role;
select pg_temp.act_as('a0000000-0000-0000-0000-000000000001');
select is(public.my_cv_export_count(extract(year from now() at time zone 'Europe/Skopje')::integer),1::bigint,'member sees their annual CV export count');
select throws_ok($$select public.begin_member_deletion('a0000000-0000-0000-0000-000000000001',false)$$,'42501',null,'member cannot bypass server password checks');
reset role; set local role service_role;
select throws_ok($$select public.begin_member_deletion('a0000000-0000-0000-0000-000000000002',false)$$,'42501',null,'admin role must be removed first');
select is(public.begin_member_deletion('a0000000-0000-0000-0000-000000000001',false)->>'status','pending','deletion starts pending');
select is(public.begin_member_deletion('a0000000-0000-0000-0000-000000000001',false)->>'status','pending','retries are idempotent');
select is(public.finish_member_deletion('a0000000-0000-0000-0000-000000000001'),false,'deletion is not complete while Auth user exists');
select is(public.mark_deletion_file_done('a0000000-0000-0000-0000-000000000001','avatars','delete-test/avatar.jpg'),false,'owned object cannot be marked complete');
reset role;
select is((select count(*)::integer from public.profiles where id = 'a0000000-0000-0000-0000-000000000001'),0,'profile is deleted');
select is((select count(*)::integer from public.memories where slug = 'kept-memory' and author_id is null and author_deleted),1,'published memory is retained as former member');
select is((select count(*)::integer from public.memories where id = 'a1000000-0000-0000-0000-000000000002'),0,'draft memory is removed');
select is((select count(*)::integer from public.ideas where reference = 'DEL-01' and name is null and email is null and user_id is null),1,'idea identity is cleared');
select is((select count(*)::integer from public.feedback where reference = 'DEL-02' and name is null and email is null and user_id is null),1,'feedback identity is cleared');
select is((select count(*)::integer from public.cv_export_log where sponsor_name = 'Partner' and profile_id is null),1,'CV export is retained without member identity');
select is((select count(*)::integer from public.account_deletion_files where user_id = 'a0000000-0000-0000-0000-000000000001' and bucket='avatars'),1,'owned Storage object is tracked');
select is((select waitlist_position from public.applications where reference = 'WAI-0002'),1,'the waitlist closes the gap left by the deleted application');
select is((select owner_id from storage.objects where bucket_id = 'memory-photos' and name = 'delete-test/kept.jpg'),null,'a photo kept by a retained Memory is detached from the deleted account');
select is((select completed_at is not null from public.account_deletion_files where bucket = 'memory-photos' and path = 'delete-test/kept.jpg'),true,'the kept photo no longer blocks completion');
-- This test fixture has no underlying blob; metadata removal simulates the Storage API succeeding.
select set_config('storage.allow_delete_query','true',true);
delete from storage.objects where bucket_id='avatars' and name='delete-test/avatar.jpg';
select set_config('storage.allow_delete_query','false',true);
set local role service_role;
select is(public.mark_deletion_file_done('a0000000-0000-0000-0000-000000000001','avatars','delete-test/avatar.jpg'),true,'removed Storage object can be marked complete');
reset role;
delete from auth.users where id = 'a0000000-0000-0000-0000-000000000001';
set local role service_role;
select is(public.finish_member_deletion('a0000000-0000-0000-0000-000000000001'),true,'deletion completes only after Storage and Auth cleanup');
select is(public.finish_member_deletion('a0000000-0000-0000-0000-000000000001'),true,'completion is idempotent');

select * from finish(); rollback;
