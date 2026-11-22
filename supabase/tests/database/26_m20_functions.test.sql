-- Functions added while building the Supabase repositories (M20): who may call them and what they return.
begin;
\ir ../helpers/isolate.inc
select plan(156);
insert into auth.users(id,aud,role,email) values
 ('a1000000-0000-0000-0000-000000000001','authenticated','authenticated','editor@test.mk'),
 ('a1000000-0000-0000-0000-000000000002','authenticated','authenticated','manager@test.mk'),
 ('a1000000-0000-0000-0000-000000000003','authenticated','authenticated','member@test.mk'),
 ('a1000000-0000-0000-0000-000000000004','authenticated','authenticated','super@test.mk');
insert into public.admin_roles(user_id,role,display_name) values
 ('a1000000-0000-0000-0000-000000000001','editor','Edi Editor'),
 ('a1000000-0000-0000-0000-000000000002','event_manager','Mia Manager'),
 ('a1000000-0000-0000-0000-000000000004','super_admin','Sue Super');
create function pg_temp.act_as(p_uid uuid,p_aal text default 'aal1') returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims',json_build_object('sub',p_uid,'role','authenticated','aal',p_aal)::text,true); set local role authenticated;
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

-- media: shipped and sample files (no bucket) are public, private ones are not
reset role;
insert into public.media(id,bucket,path,public_path,kind,file_name,status) values ('a2000000-0000-0000-0000-000000000001',null,null,'/brand/shipped.jpg','image','shipped.jpg','ready');
insert into public.media(id,bucket,path,kind,file_name,status,uploaded_by) values ('a2000000-0000-0000-0000-000000000002','avatars','x/avatar.jpg','image','avatar.jpg','ready','a1000000-0000-0000-0000-000000000003');
select pg_temp.visitor();
select is((select count(*)::integer from public.media where id = 'a2000000-0000-0000-0000-000000000001'),1,'a shipped file is readable by visitors');
select is((select count(*)::integer from public.media where id = 'a2000000-0000-0000-0000-000000000002'),0,'an avatar is not');

-- save_site_settings
create function pg_temp.payload(p_title text) returns jsonb language sql as $$
  select jsonb_build_object(
    'settings', jsonb_build_object('siteName','"Test"'::jsonb,'footerTagline','{"mk":"x"}'::jsonb,'branding','{}'::jsonb,'contact','{}'::jsonb,'weeklyMeeting','{}'::jsonb,'legal','{}'::jsonb,'events','{}'::jsonb,'retentionMonths','12'::jsonb,'notifications','{}'::jsonb),
    'board_roles', jsonb_build_array(jsonb_build_object('title', p_title, 'email', 'a@test.mk')),
    'social_links', jsonb_build_array(jsonb_build_object('platform','instagram','handle','@x','url','https://instagram.com/x')),
    'seo', jsonb_build_object('home', jsonb_build_object('title','{"mk":"T"}'::jsonb,'description','{"mk":"D"}'::jsonb)))
$$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;
select pg_temp.act_as('a1000000-0000-0000-0000-000000000001');
select throws_ok($$select public.save_site_settings(pg_temp.payload('President'))$$,'42501',null,'an editor cannot save settings');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000004');
select throws_ok($$select public.save_site_settings(pg_temp.payload('President'))$$,'42501',null,'a super admin without 2-step cannot');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000004','aal2');
select lives_ok($$select public.save_site_settings(pg_temp.payload('President'))$$,'a super admin with 2-step saves settings in one call');
select is((select count(*)::integer from public.board_roles where title = 'President'),1,'a new board role is created');
select throws_ok($$select public.save_site_settings('{"settings":{}}')$$,'22023',null,'an incomplete payload is refused');
select lives_ok($$select public.save_site_settings(pg_temp.payload('Chair'))$$,'saving again replaces the roles');
select is((select count(*)::integer from public.board_roles),1,'removed roles are gone');
-- partners: packages, tiers, sponsor order
reset role;
insert into public.sponsor_tiers(id,name,size) values ('a3000000-0000-0000-0000-000000000001','{"mk":"Gold"}','large'),('a3000000-0000-0000-0000-000000000002','{"mk":"Silver"}','small');
insert into public.sponsors(id,name,tier_id,sort_order) values
 ('a4000000-0000-0000-0000-000000000001','A','a3000000-0000-0000-0000-000000000001',0),
 ('a4000000-0000-0000-0000-000000000002','B','a3000000-0000-0000-0000-000000000002',1),
 ('a4000000-0000-0000-0000-000000000003','C','a3000000-0000-0000-0000-000000000001',2);
select pg_temp.act_as('a1000000-0000-0000-0000-000000000003');
select throws_ok($$select public.reorder_sponsors('a3000000-0000-0000-0000-000000000001',array['a4000000-0000-0000-0000-000000000003','a4000000-0000-0000-0000-000000000001']::uuid[])$$,'42501',null,'a member cannot reorder sponsors');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000001');
select is(public.reorder_sponsors('a3000000-0000-0000-0000-000000000001',array['a4000000-0000-0000-0000-000000000003','a4000000-0000-0000-0000-000000000001']::uuid[]),true,'the sponsors of a tier take the new order');
select is((select array_agg(name order by sort_order) from public.sponsors),array['C','B','A'],'they keep the slots they had in the overall list');
select is(public.reorder_sponsors('a3000000-0000-0000-0000-000000000001',array['a4000000-0000-0000-0000-000000000003']::uuid[]),false,'a partial list changes nothing');
select is(public.save_sponsor_tiers('[{"id":"a3000000-0000-0000-0000-000000000002","name":{"mk":"Silver"},"size":"small"}]')->>'status','in_use','a tier with sponsors cannot be removed');
select is(public.save_sponsor_tiers('[{"id":"a3000000-0000-0000-0000-000000000002","name":{"mk":"Silver"},"size":"small"},{"id":"a3000000-0000-0000-0000-000000000001","name":{"mk":"Gold"},"size":"large"},{"id":"new","name":{"mk":"Bronze"},"size":"small"}]')->>'status','ok','tiers save in the given order and new ones are added');
select is((select name->>'mk' from public.sponsor_tiers order by sort_order limit 1),'Silver','the order of the tiers follows the list');
select lives_ok($$select public.save_partners_page('{"hero":{}}','[{"name":{"mk":"A"},"text":{"mk":""},"price_text":{"mk":""},"cta":{"mk":""},"highlighted":true},{"name":{"mk":"B"},"text":{"mk":""},"price_text":{"mk":""},"cta":{"mk":""},"highlighted":false}]')$$,'the page and its packages save together');
select throws_ok($$select public.save_partners_page('{"hero":{}}','[{"name":{"mk":"A"},"text":{"mk":""},"price_text":{"mk":""},"cta":{"mk":""},"highlighted":true},{"name":{"mk":"B"},"text":{"mk":""},"price_text":{"mk":""},"cta":{"mk":""},"highlighted":true}]')$$,'22023',null,'two highlighted packages are refused');
-- events: who saved last, and events with applications are not deleted
reset role;
insert into public.event_types(id,name) values ('a5000000-0000-0000-0000-000000000001','{"mk":"Type"}');
insert into public.events(id,slug,title,short_description,scope,type_id,starts_at,ends_at,location,city,country,description,requirements,seo_title,seo_description,status,updated_by) values
 ('a6000000-0000-0000-0000-000000000001','with-applicants','{"mk":"A"}','{"mk":"S"}','local','a5000000-0000-0000-0000-000000000001',now()+interval '1 day',now()+interval '2 days','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','draft','a1000000-0000-0000-0000-000000000001'),
 ('a6000000-0000-0000-0000-000000000002','without-applicants','{"mk":"B"}','{"mk":"S"}','local','a5000000-0000-0000-0000-000000000001',now()+interval '1 day',now()+interval '2 days','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','draft',null);
insert into public.applications(event_id,reference,name,email,status,locale) values ('a6000000-0000-0000-0000-000000000001','APP-0001','X','x@test.mk','pending','en');
insert into public.event_managers(event_id,user_id) values ('a6000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002');
select pg_temp.visitor();
select throws_ok($$select * from public.events_updated_by(array['a6000000-0000-0000-0000-000000000001']::uuid[])$$,'42501',null,'visitors cannot ask who edited');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000001');
select is((select name from public.events_updated_by(array['a6000000-0000-0000-0000-000000000001']::uuid[])),'Edi Editor','staff see who saved last');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000002');
select is((select count(*)::integer from public.events_updated_by(array['a6000000-0000-0000-0000-000000000001','a6000000-0000-0000-0000-000000000002']::uuid[])),1,'a manager only for their events (and only where an editor is recorded)');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000001');
select is(public.remove_events(array['a6000000-0000-0000-0000-000000000001','a6000000-0000-0000-0000-000000000002']::uuid[]),array['a6000000-0000-0000-0000-000000000002']::uuid[],'an event without applications is deleted');
select is((select count(*)::integer from public.events where id = 'a6000000-0000-0000-0000-000000000001'),1,'an event with applications stays');
-- applications: form for an event, summaries, answer counts, deletion by e-mail
reset role;
insert into public.application_forms(event_id,intro,fields) values ('a6000000-0000-0000-0000-000000000001','{"mk":"Intro"}','[{"key":"why"}]');
insert into public.events(id,slug,title,short_description,scope,type_id,starts_at,ends_at,location,city,country,description,requirements,seo_title,seo_description,status,publish_at) values
 ('a6000000-0000-0000-0000-000000000003','hidden-form','{"mk":"H"}','{"mk":"S"}','local','a5000000-0000-0000-0000-000000000001',now()+interval '1 day',now()+interval '2 days','{"mk":"Here"}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','hidden',null);
insert into public.application_forms(event_id,intro,fields) values ('a6000000-0000-0000-0000-000000000003','{"mk":"Hidden intro"}','[]');
update public.applications set answers = '{"why":"Because","empty":"","flag":false}', read_at = null where reference = 'APP-0001';
insert into public.applications(event_id,reference,name,email,status,waitlist_position,locale) values
 ('a6000000-0000-0000-0000-000000000001','APP-0002','Y','y@test.mk','waitlist',1,'en'),
 ('a6000000-0000-0000-0000-000000000001','APP-0003','Z','Z@Test.mk','waitlist',2,'en');
select pg_temp.visitor();
select is(public.application_form_for_event('a6000000-0000-0000-0000-000000000003')->>'intro','{"mk": "Hidden intro"}','a visitor gets the form of a hidden event');
select is(public.application_form_for_event('a6000000-0000-0000-0000-000000000001'),null,'but not the form of a draft event');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000001');
select is((select total from public.application_summaries(array['a6000000-0000-0000-0000-000000000001']::uuid[])),3::bigint,'the board counts every application of an event');
select is((select waitlist from public.application_summaries(array['a6000000-0000-0000-0000-000000000001']::uuid[])),2::bigint,'per status');
select is(public.application_answer_counts('a6000000-0000-0000-0000-000000000001'),'{"why": 1}'::jsonb,'only answered questions are counted');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000003');
select is((select count(*)::integer from public.application_summaries(array['a6000000-0000-0000-0000-000000000001']::uuid[])),0,'a plain member counts nothing (row-level security)');
reset role; set local role service_role;
select is(public.delete_applications_by_email(' y@test.MK'),1,'deletion by e-mail ignores case and spaces');
select is((select waitlist_position from public.applications where reference = 'APP-0003'),1,'and closes the gap in the waitlist');
-- M20f: inboxes, notes, activity, dashboard
reset role;
insert into public.contact_subjects(id,name,team_label,route_note,shortcut_label) values
 ('a7000000-0000-0000-0000-000000000001','{"mk":"Тема","en":"Topic"}','{"mk":"T"}','{"mk":""}','{"mk":""}');
insert into public.contact_subject_routes(subject_id,route_email) values ('a7000000-0000-0000-0000-000000000001','route@test.mk');
insert into public.page_content(page,content) values ('join','{"apply":{"open":true}}') on conflict (page) do update set content = excluded.content;
set local role service_role;
select is(public.submit_contact_message('Sender','s@test.mk','a7000000-0000-0000-0000-000000000001','Hello','en',true,'2027-01-02 12:00+01')->>'reference','MSG-2027-0001','a message takes its reference year from the app clock');
select is(public.submit_contact_message('Sender','s@test.mk','a7000000-0000-0000-0000-000000000001','Hello','mk',true,'2027-01-02 12:00+01')->>'subject','Тема','the subject is worded in the language of the page');
select is((public.submit_partner_inquiry('P','p@test.mk','Co','',array['other'],'Hi','en',true,'2027-01-02 12:00+01')->>'consent_at')::timestamptz,'2027-01-02 12:00+01'::timestamptz,'consent is recorded at the app clock');
select is(public.submit_membership('M','m@test.mk','','F','','',array[]::text[],'','en',true,'2027-01-02 12:00+01')#>>'{application,status}','new','a membership submission returns the stored application');
select is(public.submit_membership('M','M@test.mk','','F','','',array[]::text[],'','en',true,'2027-01-02 12:00+01')->>'status','duplicate','and a duplicate is still a result');
reset role;
insert into public.contact_messages(id,reference,name,email,subject,routed_to,message,locale) values
 ('a7000000-0000-0000-0000-000000000009','T-AUDIT','N','n@test.mk','S','r@test.mk','M','en');
update public.contact_messages set status = 'new' where reference = 'T-AUDIT';
select is((select count(*)::integer from public.activity_log where target = 'T-AUDIT'),0,'a status set to the value it had is not logged');
update public.contact_messages set read_at = now() where reference = 'T-AUDIT';
select is((select count(*)::integer from public.activity_log where target = 'T-AUDIT'),0,'marking an item read is not logged');
update public.contact_messages set status = 'answered' where reference = 'T-AUDIT';
select is((select count(*)::integer from public.activity_log where target = 'T-AUDIT' and action = 'updated' and area = 'inbox'),1,'a real change is logged');

update public.events set status = 'published' where id = 'a6000000-0000-0000-0000-000000000003';
select is((select count(*)::integer from public.activity_log where target = 'H' and action = 'updated'),0,'an event going live is not logged as a plain update (the app logs "published")');
update public.events set status = 'hidden' where id = 'a6000000-0000-0000-0000-000000000003';
select is((select count(*)::integer from public.activity_log where target = 'H' and action = 'updated'),1,'but another change of the event is');

select pg_temp.visitor();
select throws_ok($$select public.mark_all_inbox_read('contact_message', now())$$,'42501',null,'visitors cannot mark messages read');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000002');
select throws_ok($$select public.mark_all_inbox_read('contact_message', now())$$,'42501',null,'managers cannot mark messages read');
select is((public.dashboard_pending()->>'count')::integer,0,'a manager has no approvals');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000003');
select throws_ok($$select public.dashboard_pending()$$,'42501',null,'a plain member cannot read the dashboard');
select is(public.internal_note_counts('contact_message'),'{}'::jsonb,'a plain member counts no notes (row-level security)');
select is((select count(*)::integer from public.activity_actors()),0,'and sees no one in the activity log');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000001');
select is(public.mark_all_inbox_read('contact_message', '2027-01-03 10:00+01'),2,'both unread messages are marked read (the audit row was read already)');
select is(public.mark_all_inbox_read('contact_message', '2027-01-03 10:00+01'),0,'and nothing the second time');
select throws_ok($$select public.mark_all_inbox_read('idea', now())$$,'22023',null,'an unknown inbox is refused');
select lives_ok($$select public.add_internal_note('contact_message','a7000000-0000-0000-0000-000000000009','one')$$,'staff add a note');
select lives_ok($$select public.add_internal_note('contact_message','a7000000-0000-0000-0000-000000000009','two')$$,'and another');
select is(public.internal_note_counts('contact_message'),'{"a7000000-0000-0000-0000-000000000009": 2}'::jsonb,'notes are counted per item');
select is(public.internal_note_counts('partner_inquiry'),'{}'::jsonb,'per kind');
reset role;
insert into public.activity_log(actor,actor_name,actor_initials,action,area,target,created_at) values
 ('a1000000-0000-0000-0000-000000000001','Old Name','OE','created','pages','x','2026-01-01'),
 ('a1000000-0000-0000-0000-000000000004','Sue Super','SS','created','pages','y','2026-01-02');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000001');
select is((select count(*)::integer from public.activity_actors() where user_id in ('a1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000004')),2,'each person appears once');
select is((select name from public.activity_actors() where user_id = 'a1000000-0000-0000-0000-000000000001'),'Edi Editor','under the name of their latest entry');
select is((public.dashboard_pending()->>'count')::integer,0,'no member is waiting yet');
reset role;
insert into auth.users(id,aud,role,email,email_confirmed_at) values ('a8000000-0000-0000-0000-000000000001','authenticated','authenticated','wait@test.mk','2027-01-02 09:00+01');
insert into auth.users(id,aud,role,email) values ('a8000000-0000-0000-0000-000000000002','authenticated','authenticated','unconfirmed@test.mk');
insert into public.profiles(id,username,full_name,status) values
 ('a8000000-0000-0000-0000-000000000001','wait','Wait Member','pending'),('a8000000-0000-0000-0000-000000000002','unconf','Unconfirmed Member','pending');
insert into public.member_accounts(profile_id,faculty,year_of_study,data_consent_at) values ('a8000000-0000-0000-0000-000000000001','FEEIT','2',now());
select pg_temp.act_as('a1000000-0000-0000-0000-000000000001');
select is(public.dashboard_pending()#>>'{items,0,name}','Wait Member','a confirmed registration waits for the board');
select is(public.dashboard_pending()#>>'{items,0,faculty}','FEEIT','with its faculty');
select is((public.dashboard_pending()->>'count')::integer,1,'an unconfirmed one does not count');
-- M20g: members
reset role;
insert into auth.users(id,aud,role,email) values
 ('a9000000-0000-0000-0000-000000000001','authenticated','authenticated','one@test.mk'),
 ('a9000000-0000-0000-0000-000000000002','authenticated','authenticated','two@test.mk'),
 ('a9000000-0000-0000-0000-000000000003','authenticated','authenticated','three@test.mk'),
 ('a9000000-0000-0000-0000-000000000004','authenticated','authenticated','four@test.mk');
insert into public.profiles(id,username,full_name,visibility,status,member_since) values
 ('a9000000-0000-0000-0000-000000000001','pub-one','Public One','public','active','2020-05-05'),
 ('a9000000-0000-0000-0000-000000000002','mem-two','Members Two','members_only','active','2021-06-06'),
 ('a9000000-0000-0000-0000-000000000003','hid-three','Hidden Three','public','hidden','2022-07-07'),
 ('a9000000-0000-0000-0000-000000000004','pen-four','Pending Four','members_only','pending',null);
insert into public.member_accounts(profile_id,faculty,data_consent_at) values
 ('a9000000-0000-0000-0000-000000000001','FEEIT',now()),('a9000000-0000-0000-0000-000000000002','FINKI',now());
insert into public.badges(id,name,icon) values ('a9b00000-0000-0000-0000-000000000001','{"mk":"B"}','star');
select pg_temp.visitor();
select is(jsonb_array_length(public.members_directory()),1,'a visitor gets the public active profiles only');
select is((select e->>'faculty' from jsonb_array_elements(public.members_directory()) e where e->>'username' = 'pub-one'),'','and never the faculty');
select is((select page from public.author_cards(array['a9000000-0000-0000-0000-000000000001']::uuid[])),'full','an author with a public profile has a full page');
select is((select page from public.author_cards(array['a9000000-0000-0000-0000-000000000002']::uuid[])),'restricted','a members-only author has a restricted page for a visitor');
select is((select page from public.author_cards(array['a9000000-0000-0000-0000-000000000003']::uuid[])),'none','a hidden author has no page');
select throws_ok($$select public.username_taken('PUB-ONE')$$,'42501',null,'a visitor cannot probe addresses');
select pg_temp.act_as('a9000000-0000-0000-0000-000000000002');
select is(jsonb_array_length(public.members_directory()),2,'a member also gets the members-only profiles');
select is((select e->>'faculty' from jsonb_array_elements(public.members_directory()) e where e->>'username' = 'mem-two'),'FINKI','a person gets their own faculty');
select is((select e->>'faculty' from jsonb_array_elements(public.members_directory()) e where e->>'username' = 'pub-one'),'','but not other people’s');
select is(public.username_taken('PUB-ONE'),true,'an address is taken in any letter case');
select is(public.username_taken('mem-two','a9000000-0000-0000-0000-000000000002'),false,'but not by oneself');
select is(public.update_my_profile('{"name":"Members Two","username":"pub-one","faculty":"FINKI"}')->>'status','username_taken','an address another profile has is a result');
select is(public.update_my_profile('{"name":"Members Two","username":"mem-new","bio":"Hi","faculty":"FINKI"}')->>'status','saved','the edit is saved');
select is(public.my_profile(2026)#>>'{profile,username}','mem-new','and read back with my_profile');
select is(public.my_profile(2026)#>>'{consents,newsletter}','false','with every choice off');
select throws_ok($$select public.profile_json('a9000000-0000-0000-0000-000000000001')$$,'42501',null,'the profile builder is not callable by a member');
select throws_ok($$select public.admin_save_member('a9000000-0000-0000-0000-000000000001','{"status":"active"}')$$,'42501',null,'a member cannot save another profile');
select pg_temp.act_as('a9000000-0000-0000-0000-000000000004');
select is(public.update_my_profile('{"name":"Pending Four","username":"pen-four","bio":"Draft"}')->>'status','saved','a person waiting for the board edits their own profile');
select is(public.my_profile(2026)#>>'{profile,status}','pending','which is still pending');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000003');
select is(public.update_my_profile('{"name":"No Row","username":"no-row"}')->>'status','not_found','a person without a profile row has none to edit');
select is(public.my_profile(2026),null,'and nothing to read');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000001');
select is(jsonb_array_length(public.members_directory()),3,'staff get hidden profiles too, and never pending ones');
select is((select e->>'faculty' from jsonb_array_elements(public.members_directory()) e where e->>'username' = 'pub-one'),'FEEIT','and every faculty');
select is(public.admin_save_member('a9000000-0000-0000-0000-000000000001','{"status":"active","member_since":"2020-05-05","badges":[{"badge_id":"a9b00000-0000-0000-0000-000000000001","note":"n"}]}','2027-03-04 23:30+00'),true,'staff save a profile');
reset role;
select is((select awarded_at from public.member_badges where profile_id = 'a9000000-0000-0000-0000-000000000001'),'2027-03-05'::date,'a new badge is awarded on the app’s day in Skopje');
-- ───────────── M20g2: the member's photo and CV ─────────────
reset role;
insert into storage.objects(bucket_id, name, owner_id) values
 ('avatars', 'a9000000-0000-0000-0000-000000000002/one.jpg', 'a9000000-0000-0000-0000-000000000002'),
 ('avatars', 'a9000000-0000-0000-0000-000000000002/two.jpg', 'a9000000-0000-0000-0000-000000000002'),
 ('avatars', 'a9000000-0000-0000-0000-000000000001/theirs.jpg', 'a9000000-0000-0000-0000-000000000001'),
 ('cvs', 'a9000000-0000-0000-0000-000000000002/one.pdf', 'a9000000-0000-0000-0000-000000000002'),
 ('cvs', 'a9000000-0000-0000-0000-000000000002/two.pdf', 'a9000000-0000-0000-0000-000000000002');
select pg_temp.visitor();
select throws_ok($$select public.set_my_photo('a9000000-0000-0000-0000-000000000002/one.jpg', 'image/jpeg', 4)$$, '42501', null, 'a visitor cannot register a photo');
select throws_ok($$select public.remove_my_cv()$$, '42501', null, 'or touch a CV');
select pg_temp.act_as('a9000000-0000-0000-0000-000000000002');
select throws_ok($$select public.set_my_photo('a9000000-0000-0000-0000-000000000001/theirs.jpg', 'image/jpeg', 4)$$, '22023', null, 'a photo in someone else’s folder is refused');
select throws_ok($$select public.set_my_photo('a9000000-0000-0000-0000-000000000002/missing.jpg', 'image/jpeg', 4)$$, '22023', null, 'and so is a file that was never uploaded');
select is(public.set_my_photo('a9000000-0000-0000-0000-000000000002/one.jpg', 'image/jpeg', 4)->>'status', 'saved', 'a member makes an uploaded file their photo');
select is((select count(*)::integer from public.media where path = 'a9000000-0000-0000-0000-000000000002/one.jpg' and uploaded_by = 'a9000000-0000-0000-0000-000000000002' and bucket = 'avatars'), 1, 'which is a media row of theirs');
select is(public.set_my_photo('a9000000-0000-0000-0000-000000000002/two.jpg', 'image/jpeg', 4)->>'previous', 'a9000000-0000-0000-0000-000000000002/one.jpg', 'a second photo names the one it replaces');
select is((select count(*)::integer from public.media where path = 'a9000000-0000-0000-0000-000000000002/one.jpg'), 0, 'whose media row is gone');
select is(public.remove_my_photo(), 'a9000000-0000-0000-0000-000000000002/two.jpg', 'removing the photo names the file');
select is(public.remove_my_photo(), null, 'and removing it again finds none');
select is(public.set_my_cv('a9000000-0000-0000-0000-000000000002/one.pdf', 'one.pdf', 5)->>'status', 'not_opted_in', 'a CV needs CV sharing to be on');
update public.member_accounts set cv_opt_in = true where profile_id = 'a9000000-0000-0000-0000-000000000002';
select is(public.set_my_cv('a9000000-0000-0000-0000-000000000002/one.pdf', 'one.pdf', 5, '2027-01-02 10:00+00')->>'status', 'stored', 'with sharing on it is stored');
select is((select cv_uploaded_at from public.member_accounts where profile_id = 'a9000000-0000-0000-0000-000000000002'), '2027-01-02 10:00+00'::timestamptz, 'at the app’s time');
select is(public.set_my_cv('a9000000-0000-0000-0000-000000000002/two.pdf', 'two.pdf', 6)->>'previous', 'a9000000-0000-0000-0000-000000000002/one.pdf', 'a second CV names the one it replaces');
select is(public.remove_my_cv(), 'a9000000-0000-0000-0000-000000000002/two.pdf', 'removing the CV names the file');
reset role;
select is((select count(*)::integer from public.storage_cleanup_queue where path in ('a9000000-0000-0000-0000-000000000002/one.jpg', 'a9000000-0000-0000-0000-000000000002/two.jpg', 'a9000000-0000-0000-0000-000000000002/one.pdf', 'a9000000-0000-0000-0000-000000000002/two.pdf')), 4, 'every replaced or removed file is queued for clean-up');
-- ───────────── M20h: Memories ─────────────
reset role;
insert into storage.objects(bucket_id, name, owner_id) values
 ('memory-photos', 'a9000000-0000-0000-0000-000000000002/m1.jpg', 'a9000000-0000-0000-0000-000000000002'),
 ('memory-photos', 'a9000000-0000-0000-0000-000000000001/theirs.jpg', 'a9000000-0000-0000-0000-000000000001');
select pg_temp.visitor();
select throws_ok($$select public.register_memory_photo('a9000000-0000-0000-0000-000000000002/m1.jpg', 'image/jpeg', 4, 640, 480)$$, '42501', null, 'a visitor cannot register a Memory photo');
select pg_temp.act_as('a9000000-0000-0000-0000-000000000002');
select throws_ok($$select public.register_memory_photo('a9000000-0000-0000-0000-000000000001/theirs.jpg', 'image/jpeg', 4, 640, 480)$$, '22023', null, 'a photo in someone else’s folder is refused');
select throws_ok($$select public.register_memory_photo('a9000000-0000-0000-0000-000000000002/m1.jpg', 'image/jpeg', 4, 0, 480)$$, '22023', null, 'and so is a size that is not one');
select isnt(public.register_memory_photo('a9000000-0000-0000-0000-000000000002/m1.jpg', 'image/jpeg', 4, 640, 480), null, 'a member registers an uploaded photo');
select is((select count(*)::integer from public.media where bucket = 'memory-photos' and path = 'a9000000-0000-0000-0000-000000000002/m1.jpg' and uploaded_by = 'a9000000-0000-0000-0000-000000000002'), 1, 'as a media row of theirs');
reset role;
insert into public.memories(id, author_id, slug, status, title, body, city, country, event_id, published_at, cover_media_id)
  values ('a9e00000-0000-0000-0000-000000000001', 'a9000000-0000-0000-0000-000000000002', 'm20h-live', 'published', 'M20h live story',
          '<p>Some <b>bold</b> words</p>', 'Bitola', 'North Macedonia', null, '2026-06-01 10:00+00',
          (select id from public.media where path = 'a9000000-0000-0000-0000-000000000002/m1.jpg')),
         ('a9e00000-0000-0000-0000-000000000002', 'a9000000-0000-0000-0000-000000000002', null, 'draft', 'M20h draft story', '', '', '', null, null, null);
select pg_temp.visitor();
select is((public.memory_media_sizes(array[(select cover_media_id from public.memories where id = 'a9e00000-0000-0000-0000-000000000001')]) -> (select cover_media_id::text from public.memories where id = 'a9e00000-0000-0000-0000-000000000001') ->> 'width'), '640', 'anyone may ask for the size of a Memory photo');
select is(public.memory_photo_path((select cover_media_id from public.memories where id = 'a9e00000-0000-0000-0000-000000000001')), 'a9000000-0000-0000-0000-000000000002/m1.jpg', 'the photo of a published Memory has a path for a visitor');
select is((public.memory_page('', null, null, null, 'a9000000-0000-0000-0000-000000000002') ->> 'total')::integer, 1, 'the list holds the published Memory, not the draft');
select is((public.memory_page('bold', null, null, null, 'a9000000-0000-0000-0000-000000000002') ->> 'total')::integer, 1, 'search reads the text');
select is((public.memory_page('<b>', null, null, null, 'a9000000-0000-0000-0000-000000000002') ->> 'total')::integer, 0, 'but not its tags');
select is((public.memory_page('%', null, null, null, 'a9000000-0000-0000-0000-000000000002') ->> 'total')::integer, 0, 'and a percent sign is not a wildcard');
select ok((public.memory_facets() -> 'places') ? 'Bitola, North Macedonia', 'the place facet lists the published place');
reset role;
select set_config('m20h.media', (select id::text from public.media where path = 'a9000000-0000-0000-0000-000000000002/m1.jpg'), true);
select pg_temp.act_as('a9000000-0000-0000-0000-000000000004');
select is(public.memory_photo_path(current_setting('m20h.media')::uuid), 'a9000000-0000-0000-0000-000000000002/m1.jpg', 'a signed-in member also gets the path of a published photo');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000001');
select cmp_ok((public.memory_admin_counts() ->> 'published')::integer, '>=', 1, 'staff count the published Memories');
select is((public.memory_admin_counts() ->> 'all')::integer, (public.memory_admin_counts() ->> 'draft')::integer + (public.memory_admin_counts() ->> 'pending')::integer + (public.memory_admin_counts() ->> 'published')::integer + (public.memory_admin_counts() ->> 'rejected')::integer, 'and every status adds up to all');
-- ───────────── M20i: the session, registrations, account details, board accounts and the deletion queue ─────────────
reset role;
insert into auth.users(id, aud, role, email, email_confirmed_at) values
 ('a1000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'm20i-pending@test.mk', now()),
 ('a1000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'm20i-unconfirmed@test.mk', null);
update auth.users set email_confirmed_at = now() where id = 'a1000000-0000-0000-0000-000000000003';
insert into public.profiles(id, username, full_name, status, visibility) values
 ('a1000000-0000-0000-0000-000000000003', 'm20i-member', 'M20i Member', 'active', 'public'),
 ('a1000000-0000-0000-0000-000000000005', 'm20i-pending', 'M20i Pending', 'pending', 'members_only'),
 ('a1000000-0000-0000-0000-000000000006', 'm20i-unconfirmed', 'M20i Unconfirmed', 'pending', 'members_only');
insert into public.member_accounts(profile_id, faculty, year_of_study, phone, data_consent_at, registration_locale) values
 ('a1000000-0000-0000-0000-000000000003', 'FEEIT', '2', '070', now(), 'mk'),
 ('a1000000-0000-0000-0000-000000000005', 'FINKI', '3', '071', now(), 'en'),
 ('a1000000-0000-0000-0000-000000000006', 'FINKI', '1', '072', now(), 'mk');
select pg_temp.visitor();
select throws_ok($$select public.my_session()$$, '42501', null, 'a visitor has no session to read');
select throws_ok($$select public.member_registrations()$$, '42501', null, 'or registrations');
select throws_ok($$select public.account_details('a1000000-0000-0000-0000-000000000003')$$, '42501', null, 'or account details');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000003');
select is(public.my_session() ->> 'member_status', 'active', 'a member’s session carries their status');
select is(public.my_session() ->> 'name', 'M20i Member', 'and their name');
select is(public.my_session() ->> 'admin_role', null, 'and no board role');
select is((select count(*)::integer from jsonb_array_elements(public.member_registrations())), 1, 'a person sees their own registration only');
select is(jsonb_array_length(public.member_registrations('a1000000-0000-0000-0000-000000000005')), 0, 'and not someone else’s');
select is(public.account_details('a1000000-0000-0000-0000-000000000003') ->> 'email', 'member@test.mk', 'their account details carry the e-mail from Auth');
select is(public.account_details('a1000000-0000-0000-0000-000000000005'), null, 'but not another person’s');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000001');
select is(public.my_session() ->> 'admin_role', 'editor', 'a board member’s session carries their role');
select is(public.my_session() ->> 'member_status', null, 'and no member status without a profile');
select is((select e ->> 'status' from jsonb_array_elements(public.member_registrations()) e where e ->> 'user_id' = 'a1000000-0000-0000-0000-000000000005'), 'pending', 'the board sees a confirmed registration as pending');
select is((select e ->> 'status' from jsonb_array_elements(public.member_registrations()) e where e ->> 'user_id' = 'a1000000-0000-0000-0000-000000000006'), 'awaiting_confirmation', 'and one without the e-mail link used as awaiting');
select is((select e ->> 'status' from jsonb_array_elements(public.member_registrations()) e where e ->> 'user_id' = 'a1000000-0000-0000-0000-000000000003'), 'active', 'and an approved one as active');
select is((select count(*)::integer from jsonb_array_elements(public.member_registrations(null, 'pending')) e where e ->> 'user_id' = 'a1000000-0000-0000-0000-000000000005'), 1, 'filtered by status it lists the pending ones');
select is((select count(*)::integer from jsonb_array_elements(public.member_registrations(null, 'pending')) e where e ->> 'status' <> 'pending'), 0, 'and only those');
select is(public.account_details('a1000000-0000-0000-0000-000000000005') ->> 'email', 'm20i-pending@test.mk', 'the board reads any account’s details');
select throws_ok($$select public.admin_accounts()$$, '42501', null, 'an editor cannot list board accounts');
select throws_ok($$select public.admin_update_role('a1000000-0000-0000-0000-000000000002', 'editor')$$, '42501', null, 'or change a role');
select throws_ok($$select public.admin_remove_role('a1000000-0000-0000-0000-000000000002')$$, '42501', null, 'or remove one');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000004', 'aal1');
select is(public.my_session() ->> 'admin_role', null, 'a super admin without 2-step has no role yet');
select throws_ok($$select public.admin_accounts()$$, '42501', null, 'and cannot list board accounts');
select pg_temp.act_as('a1000000-0000-0000-0000-000000000004', 'aal2');
select is(public.my_session() ->> 'admin_role', 'super_admin', 'with 2-step they do');
select is((select e ->> 'two_factor' from jsonb_array_elements(public.admin_accounts()) e where e ->> 'user_id' = 'a1000000-0000-0000-0000-000000000004'), 'not_set_up', 'a super admin without a factor is "not set up"');
select is((select e ->> 'two_factor' from jsonb_array_elements(public.admin_accounts()) e where e ->> 'user_id' = 'a1000000-0000-0000-0000-000000000001'), 'off', 'an editor’s is off');
select is((select e ->> 'role' from jsonb_array_elements(public.admin_accounts()) e limit 1), 'super_admin', 'the list starts with super admins');
select is(public.admin_update_role('a1000000-0000-0000-0000-000000000001', 'event_manager', array[]::uuid[]), true, 'a super admin changes a role');
select is((select e ->> 'role' from jsonb_array_elements(public.admin_accounts()) e where e ->> 'user_id' = 'a1000000-0000-0000-0000-000000000001'), 'event_manager', 'and it shows');
select is(public.admin_update_role('a1000000-0000-0000-0000-000000000099', 'editor'), false, 'a person without a role has none to change');
select is(public.admin_remove_role('a1000000-0000-0000-0000-000000000002'), true, 'a super admin removes board access');
select is(public.admin_remove_role('a1000000-0000-0000-0000-000000000002'), false, 'once');
reset role;
select is((select count(*)::integer from public.profiles where id = 'a1000000-0000-0000-0000-000000000003'), 1, 'and a member account is left alone');
insert into public.account_deletion_jobs(user_id, delete_published_memories) values ('a1000000-0000-0000-0000-000000000003', false);
insert into public.account_deletion_files(user_id, bucket, path) values ('a1000000-0000-0000-0000-000000000003', 'avatars', 'gone/a.jpg');
set local role service_role;
select is(public.pending_deletion_files('a1000000-0000-0000-0000-000000000003') -> 0 ->> 'path', 'gone/a.jpg', 'the server reads the files still to remove');
reset role;
select pg_temp.act_as('a1000000-0000-0000-0000-000000000003');
select is(public.my_session(), null, 'an account being deleted has no session');
select throws_ok($$select public.pending_deletion_files('a1000000-0000-0000-0000-000000000003')$$, '42501', null, 'and nobody but the server reads the queue');
select * from finish();
rollback;
