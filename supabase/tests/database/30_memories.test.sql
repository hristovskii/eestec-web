-- Memory visibility, authorship, and the live/revision state machine.
begin;
\ir ../helpers/isolate.inc
select plan(29);
insert into auth.users(id,aud,role,email,email_confirmed_at) values
 ('80000000-0000-0000-0000-000000000001','authenticated','authenticated','author@test.mk',now()),
 ('80000000-0000-0000-0000-000000000002','authenticated','authenticated','pending@test.mk',now()),
 ('80000000-0000-0000-0000-000000000003','authenticated','authenticated','editor@test.mk',now()),
 ('80000000-0000-0000-0000-000000000004','authenticated','authenticated','manager@test.mk',now()),
 ('80000000-0000-0000-0000-000000000005','authenticated','authenticated','super@test.mk',now()),
 ('80000000-0000-0000-0000-000000000006','authenticated','authenticated','alumni@test.mk',now());
insert into public.profiles(id,username,full_name,status) values
 ('80000000-0000-0000-0000-000000000001','author-test','Author Test','active'),
 ('80000000-0000-0000-0000-000000000002','pending-test','Pending Test','pending'),
 ('80000000-0000-0000-0000-000000000006','alumni-test','Alumni Test','alumni');
insert into public.admin_roles(user_id,role) values
 ('80000000-0000-0000-0000-000000000003','editor'),
 ('80000000-0000-0000-0000-000000000004','event_manager'),
 ('80000000-0000-0000-0000-000000000005','super_admin');
insert into public.media(id,bucket,path,kind,file_name,uploaded_by) values
 ('81000000-0000-0000-0000-000000000001','memory-photos','author/cover.jpg','image','cover.jpg','80000000-0000-0000-0000-000000000001');
create function pg_temp.content(p_title text,p_body text) returns jsonb language sql as $$
  select jsonb_build_object('title',p_title,'body',p_body,'otherEventName','An event','city','Skopje','country','MK',
    'cover',jsonb_build_object('fileId','81000000-0000-0000-0000-000000000001','alt','Cover'),'photos','[]'::jsonb)
$$;
create function pg_temp.act_as(p_uid uuid,p_aal text default 'aal1') returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims',json_build_object('sub',p_uid,'role','authenticated','aal',p_aal)::text,true); set local role authenticated;
end $$;
create function pg_temp.visitor() returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims','{"role":"anon"}',true); set local role anon;
end $$;
grant execute on all functions in schema pg_temp to anon,authenticated,service_role;
select pg_temp.act_as('80000000-0000-0000-0000-000000000002');
select throws_ok($$select public.memory_save_draft(null,'{"title":"Test","body":"Story","photos":[]}')$$,'42501',null,'pending member cannot create a Memory');
select pg_temp.act_as('80000000-0000-0000-0000-000000000001');
select is(public.memory_save_draft(null,pg_temp.content('First','Story'))->>'status','saved','active author creates a draft');
select is((select count(*)::integer from public.memories),1,'author can see own draft');
select throws_ok($$update public.memories set status = 'published'$$,'42501',null,'author cannot publish directly');
select is(public.memory_submit((select id from public.memories limit 1),pg_temp.content('First','Story'))->>'status','submitted','author submits for approval');
select is(public.memory_save_draft((select id from public.memories limit 1),pg_temp.content('Changed','Story'))->>'status','locked','pending memory is locked');
select pg_temp.visitor();
select is((select count(*)::integer from public.memories),0,'visitor cannot see pending memory');
select pg_temp.act_as('80000000-0000-0000-0000-000000000004');
select is((select count(*)::integer from public.memories),0,'event manager cannot see pending memory');
select pg_temp.act_as('80000000-0000-0000-0000-000000000005');
select throws_ok($$select public.memory_decide('ffffffff-ffff-ffff-ffff-ffffffffffff',true)$$,'42501',null,'super admin without MFA cannot decide');
select pg_temp.act_as('80000000-0000-0000-0000-000000000003');
select is((select title from public.memory_queue limit 1),'First','the review queue shows the title of a waiting Memory');
select is((select photo_count from public.memory_queue limit 1),0,'the review queue shows the photo count');
select is(public.memory_decide((select id from public.memories limit 1),true)->>'status','approved','editor approves the Memory');
select pg_temp.visitor();
select is((select count(*)::integer from public.memories),1,'visitor sees published memory');
select throws_ok($$select reviewed_by from public.memories$$,'42501',null,'visitors cannot read the reviewer account id');
select throws_ok($$select rejection_reason from public.memories$$,'42501',null,'visitors cannot read moderation notes');
select throws_ok($$select is_sample from public.memories$$,'42501',null,'visitors cannot read the sample flag');
select public.memory_count_read('first');
select is((select reads_count from public.memories where slug = 'first'),1,'visitor read is counted');
select pg_temp.act_as('80000000-0000-0000-0000-000000000001');
select public.memory_count_read('first');
select is((select reads_count from public.memories where slug = 'first'),1,'author read is not counted');
select is(public.memory_submit((select id from public.memories limit 1),pg_temp.content('Revised','New story'))->>'revision','true','published edit creates a revision');
select is((select title from public.memories where slug = 'first'),'First','live content remains unchanged while revision waits');
select pg_temp.visitor();
select throws_ok($$select * from public.memory_revisions$$,'42501',null,'visitor cannot read revisions');
select pg_temp.act_as('80000000-0000-0000-0000-000000000003');
select is(public.memory_decide((select id from public.memories limit 1),true)->>'kind','revision','editor approves revision');
select is((select title from public.memories where slug = 'first'),'Revised','approval replaces live content without changing slug');
select is(public.memory_unpublish((select id from public.memories limit 1)),true,'editor can unpublish');
-- A photo the server copied (impression) or the board added belongs to the Memory, so its author may keep using it.
reset role;
insert into public.media(id,bucket,path,kind,file_name,uploaded_by) values
 ('81000000-0000-0000-0000-000000000002','memory-photos','copied.jpg','image','copied.jpg',null),
 ('81000000-0000-0000-0000-000000000003','memory-photos','foreign.jpg','image','foreign.jpg','80000000-0000-0000-0000-000000000003'),
 ('81000000-0000-0000-0000-000000000004','memory-photos','alumni.jpg','image','alumni.jpg','80000000-0000-0000-0000-000000000006');
insert into public.memory_photos(memory_id,media_id,alt) select id,'81000000-0000-0000-0000-000000000002','Copied' from public.memories limit 1;
select pg_temp.act_as('80000000-0000-0000-0000-000000000001');
select is(public.memory_save_draft((select id from public.memories limit 1),
  pg_temp.content('Revised','New story') || '{"photos":[{"fileId":"81000000-0000-0000-0000-000000000002","alt":"Copied"}]}')->>'status','saved','an author keeps a photo the Memory already uses');
select throws_ok($$select public.memory_save_draft((select id from public.memories limit 1),
  pg_temp.content('Revised','New story') || '{"photos":[{"fileId":"81000000-0000-0000-0000-000000000003","alt":"Foreign"}]}')$$,'42501',null,'an author cannot attach someone elses photo');
select pg_temp.act_as('80000000-0000-0000-0000-000000000005','aal2');
select is(public.memory_decide('ffffffff-ffff-ffff-ffff-ffffffffffff',true)->>'status','not_found','a super admin with 2-step may decide');
select pg_temp.act_as('80000000-0000-0000-0000-000000000006');
select is(public.memory_save_draft(null,pg_temp.content('Alumni story','Story') || '{"cover":{"fileId":"81000000-0000-0000-0000-000000000004","alt":"Alumni"}}')->>'status','saved','an alumnus can write a Memory');
reset role;
select is(public.memory_new_slug('Наша приказна'),'nasha-prikazna','Macedonian title is transliterated for its slug');
select * from finish(); rollback;
