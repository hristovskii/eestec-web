-- Revocable images and submission files never have public bucket access.
begin;
\ir ../helpers/isolate.inc
select plan(19);
insert into auth.users(id,aud,role,email) values
 ('b0000000-0000-0000-0000-000000000001','authenticated','authenticated','manager@test.mk'),
 ('b0000000-0000-0000-0000-000000000002','authenticated','authenticated','editor@test.mk'),
 ('b0000000-0000-0000-0000-000000000003','authenticated','authenticated','public@test.mk'),
 ('b0000000-0000-0000-0000-000000000004','authenticated','authenticated','private@test.mk'),
 ('b0000000-0000-0000-0000-000000000005','authenticated','authenticated','hidden@test.mk');
insert into public.profiles(id,username,full_name,status,visibility,hide_photo) values
 ('b0000000-0000-0000-0000-000000000003','public-test','Public Test','active','public',false),
 ('b0000000-0000-0000-0000-000000000004','private-test','Private Test','active','members_only',false),
 ('b0000000-0000-0000-0000-000000000005','hidden-test','Hidden Test','active','public',true);
insert into public.media(id,bucket,path,kind,file_name,uploaded_by) values
 ('b1000000-0000-0000-0000-000000000001','avatars','avatars/public.jpg','image','public.jpg','b0000000-0000-0000-0000-000000000003'),
 ('b1000000-0000-0000-0000-000000000002','avatars','avatars/private.jpg','image','private.jpg','b0000000-0000-0000-0000-000000000004'),
 ('b1000000-0000-0000-0000-000000000003','avatars','avatars/hidden.jpg','image','hidden.jpg','b0000000-0000-0000-0000-000000000005'),
 ('b1000000-0000-0000-0000-000000000004','memory-photos','mem/published.jpg','image','published.jpg','b0000000-0000-0000-0000-000000000003'),
 ('b1000000-0000-0000-0000-000000000005','memory-photos','mem/draft.jpg','image','draft.jpg','b0000000-0000-0000-0000-000000000003');
update public.profiles set photo_media_id = 'b1000000-0000-0000-0000-000000000001' where username = 'public-test';
update public.profiles set photo_media_id = 'b1000000-0000-0000-0000-000000000002' where username = 'private-test';
update public.profiles set photo_media_id = 'b1000000-0000-0000-0000-000000000003' where username = 'hidden-test';
insert into public.memories(id,author_id,slug,status,title,body,published_at,cover_media_id) values
 ('b2000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000003','shown','published','Shown','Body',now(),'b1000000-0000-0000-0000-000000000004');
insert into public.memories(id,author_id,status,title,body) values ('b2000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000003','draft','Draft','Body');
insert into public.memory_photos(memory_id,media_id,alt) values ('b2000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000005','Draft photo');
insert into public.admin_roles(user_id,role) values ('b0000000-0000-0000-0000-000000000001','event_manager'),('b0000000-0000-0000-0000-000000000002','editor');
insert into storage.objects(bucket_id,name,owner_id) values
 ('avatars','b0000000-0000-0000-0000-000000000001/private.jpg','b0000000-0000-0000-0000-000000000001'),
 ('memory-photos','b0000000-0000-0000-0000-000000000001/draft.jpg','b0000000-0000-0000-0000-000000000001'),
 ('submissions','private/feedback.jpg','b0000000-0000-0000-0000-000000000001'),
 ('public-media','b0000000-0000-0000-0000-000000000001/owned.jpg','b0000000-0000-0000-0000-000000000001');
create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims',json_build_object('sub',p_uid,'role','authenticated','aal','aal1')::text,true); set local role authenticated;
end $$;
create function pg_temp.visitor() returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims','{"role":"anon"}',true); set local role anon;
end $$;
grant execute on all functions in schema pg_temp to anon,authenticated,service_role;
select is((select count(*)::integer from storage.buckets where id in ('avatars','memory-photos','cvs','submissions','application-files') and not public),5,'sensitive buckets are private');
select is((select count(*)::integer from storage.buckets where id in ('public-media','documents') and public),2,'site media and documents are public');
select is((select count(*)::integer from storage.buckets where 'image/svg+xml' = any(allowed_mime_types)),0,'no bucket accepts uploaded SVG');
select pg_temp.act_as('b0000000-0000-0000-0000-000000000001');
select is((select count(*)::integer from storage.objects where bucket_id = 'avatars'),0,'owner cannot bypass avatar endpoint');
select is((select count(*)::integer from storage.objects where bucket_id = 'memory-photos'),0,'owner cannot bypass Memory photo endpoint');
select is((select count(*)::integer from storage.objects where bucket_id = 'submissions'),0,'manager cannot open feedback files');
select is((select count(*)::integer from storage.objects where bucket_id = 'public-media'),1,'manager sees own public media metadata');
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id) values ('public-media','other/file.jpg','b0000000-0000-0000-0000-000000000001')$$,'42501',null,'manager cannot upload outside own folder');
select pg_temp.act_as('b0000000-0000-0000-0000-000000000002');
select is((select count(*)::integer from storage.objects where bucket_id = 'memory-photos'),0,'editor must use the authorized private-file endpoint');
select is((public.dashboard_counts() #>> '{ideas,newIdeas}')::integer,0,'dashboard includes idea count');
-- Authorized delivery decisions for revocable images (the route that serves them calls these).
select pg_temp.visitor();
select is(public.can_read_memory_photo('mem/published.jpg'),true,'a published Memory photo is public');
select is(public.can_read_memory_photo('mem/draft.jpg'),false,'a draft Memory photo is not');
select is(public.can_read_avatar('avatars/public.jpg'),true,'a public profile photo is public');
select is(public.can_read_avatar('avatars/private.jpg'),false,'a members-only photo is hidden from visitors');
select pg_temp.act_as('b0000000-0000-0000-0000-000000000003');
select is(public.can_read_memory_photo('mem/draft.jpg'),true,'the author sees their draft photo');
select is(public.can_read_avatar('avatars/private.jpg'),true,'a member sees a members-only photo');
select pg_temp.act_as('b0000000-0000-0000-0000-000000000004');
select is(public.can_read_memory_photo('mem/draft.jpg'),false,'another member does not see a draft photo');
select pg_temp.act_as('b0000000-0000-0000-0000-000000000002');
select is(public.can_read_memory_photo('mem/draft.jpg'),true,'staff see a draft photo');
select is(public.can_read_avatar('avatars/hidden.jpg'),true,'staff see a moderated photo');
select * from finish(); rollback;
