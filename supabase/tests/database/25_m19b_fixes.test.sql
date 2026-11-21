-- Fixes to the M19b schema found in the M19 review (migration 0014): activity for managers, duplicate
-- memberships, application files, public columns of events, slug helpers, ordering, committees, media usage.
begin;
\ir ../helpers/isolate.inc
select plan(48);

insert into auth.users(id,aud,role,email,email_confirmed_at) values
 ('70000000-0000-0000-0000-000000000001','authenticated','authenticated','manager@test.mk',now()),
 ('70000000-0000-0000-0000-000000000002','authenticated','authenticated','other@test.mk',now()),
 ('70000000-0000-0000-0000-000000000003','authenticated','authenticated','editor@test.mk',now()),
 ('70000000-0000-0000-0000-000000000004','authenticated','authenticated','member@test.mk',now());
insert into public.profiles(id,username,full_name,status) values
 ('70000000-0000-0000-0000-000000000004','member-test','Member Test','active');
insert into public.admin_roles(user_id,role,display_name) values
 ('70000000-0000-0000-0000-000000000001','event_manager','Mia Manager'),
 ('70000000-0000-0000-0000-000000000002','event_manager','Olga Other'),
 ('70000000-0000-0000-0000-000000000003','editor','Edi Editor');
insert into public.event_types(id,name,sort_order) values ('71000000-0000-0000-0000-000000000001','{"mk":"Workshop"}',5);
insert into public.events(id,slug,title,short_description,scope,type_id,starts_at,ends_at,location,city,country,description,requirements,seo_title,seo_description,status,applications_enabled,admission,max_participants,waitlist,deadline,updated_by)
values
 ('72000000-0000-0000-0000-000000000001','ai-at-the-edge','{"mk":"Edge"}','{"mk":"Short"}','local','71000000-0000-0000-0000-000000000001',now()+interval '1 day',now()+interval '2 days','{"mk":"Here"}','{"mk":"City"}','{"mk":"MK"}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','published',true,'selection',1,true,now()+interval '12 hours','70000000-0000-0000-0000-000000000003'),
 ('72000000-0000-0000-0000-000000000002','hidden-one','{"mk":"Hidden"}','{"mk":"Short"}','local','71000000-0000-0000-0000-000000000001',now()+interval '1 day',now()+interval '2 days','{"mk":"Here"}','{"mk":"City"}','{"mk":"MK"}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','hidden',true,'selection',1,true,now()+interval '12 hours',null);
insert into public.event_managers(event_id,user_id) values ('72000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001');
insert into public.slug_redirects(old_slug,event_id) values ('old-name','72000000-0000-0000-0000-000000000001');
insert into public.page_content(page,content) values ('join','{"apply":{"open":true}}');
insert into public.committees(id,name,city,country,status,lat,lng,is_home) values
 ('73000000-0000-0000-0000-000000000001','Skopje','{"mk":"Skopje"}','MK','lc',41.99,21.43,true),
 ('73000000-0000-0000-0000-000000000002','Belgrade','{"mk":"Belgrade"}','RS','lc',44.8,20.46,false);
insert into public.media(id,bucket,path,kind,file_name,status) values
 ('74000000-0000-0000-0000-000000000001','public-media','a.jpg','image','a.jpg','ready'),
 ('74000000-0000-0000-0000-000000000002','public-media','b.jpg','image','b.jpg','ready');
insert into public.sponsor_tiers(id,name,size) values ('75000000-0000-0000-0000-000000000001','{"mk":"Tier"}','small');
insert into public.sponsors(id,name,tier_id,logo_media_id) values
 ('75000000-0000-0000-0000-000000000002','Acme','75000000-0000-0000-0000-000000000001','74000000-0000-0000-0000-000000000001');

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims',json_build_object('sub',p_uid,'role','authenticated','aal','aal1')::text,true); set local role authenticated;
end $$;
create function pg_temp.visitor() returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims','{"role":"anon"}',true); set local role anon;
end $$;
create function pg_temp.service() returns void language plpgsql as $$ begin
 reset role; set local role service_role;
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

-- ───────────── Reference prefix mirrors the app (A8) ─────────────
select is(public.application_reference_prefix('ai-at-the-edge'),'AIE','small words are skipped: ai-at-the-edge is AIE');
select is(public.application_reference_prefix('leading-teams'),'LEA','first three letters');
select is(public.application_reference_prefix('x-y'),'XYX','short slugs are padded with X');
select is(public.application_reference_prefix('the-of-a'),'APP','a slug of small words falls back to APP');

-- ───────────── Activity log for event managers (B1) ─────────────
select pg_temp.visitor();
select throws_ok($$select public.record_activity('updated','events','x')$$,'42501',null,'visitor cannot log activity');
select pg_temp.act_as('70000000-0000-0000-0000-000000000004');
select throws_ok($$select public.record_activity('updated','events','x')$$,'42501',null,'plain member cannot log activity');
select pg_temp.act_as('70000000-0000-0000-0000-000000000001');
select lives_ok($$select public.record_activity('published','events','Edge','/admin/events/x')$$,'event manager logs an event action');
select lives_ok($$select public.record_activity('updated','applications','Edge applications')$$,'event manager logs an application action');
select lives_ok($$select public.record_activity('uploaded','media','cover.jpg')$$,'event manager logs an upload');
select throws_ok($$select public.record_activity('updated','settings','Settings')$$,'42501',null,'event manager cannot log a settings change');
select throws_ok($$select public.record_activity('updated','inbox','Messages')$$,'42501',null,'event manager cannot log inbox activity');
select pg_temp.act_as('70000000-0000-0000-0000-000000000003');
select lives_ok($$select public.record_activity('updated','settings','Settings')$$,'editor logs any area');
reset role;
select is((select actor_initials from public.activity_log where actor = '70000000-0000-0000-0000-000000000001' limit 1),'MM','initials are stored with the entry');

-- ───────────── Membership duplicate is a result (B2) ─────────────
select pg_temp.service();
select is((public.submit_membership('Ana','ana@test.mk','','FEEIT','','',array[]::text[],'','en',true)->>'status'),'created','first membership application is created');
select is((public.submit_membership('Ana Again','ANA@test.mk ','','FEEIT','','',array[]::text[],'','en',true)->>'status'),'duplicate','same e-mail is reported as a duplicate, not raised');

-- ───────────── Application files travel with the application (B3) ─────────────
select throws_ok($$select public.submit_application('72000000-0000-0000-0000-000000000001','Bad','bad@test.mk','{}','en',true,null,'[{"field_key":"cv"}]')$$,'22023',null,'incomplete file descriptions are refused');
select is((public.submit_application('72000000-0000-0000-0000-000000000001','Ana','ana@test.mk','{}','en',true,null,
  '[{"field_key":"cv","path":"apps/cv-1.pdf","file_name":"cv.pdf","mime_type":"application/pdf","size_bytes":1200}]')->>'status'),'created','application with a file is created');
reset role;
select is((select count(*)::integer from public.application_files f join public.applications a on a.id = f.application_id where a.email = 'ana@test.mk'),1,'the file row is stored with the application');
select ok((select reference from public.applications where email = 'ana@test.mk') like 'AIE-%','reference uses the app prefix');

-- ───────────── Public columns of events (A2), who edited last (A3) ─────────────
select pg_temp.visitor();
select throws_ok($$select updated_by from public.events$$,'42501',null,'visitors cannot read the editor id');
select is((select count(*)::integer from public.events),1,'visitors still list published events');
select pg_temp.act_as('70000000-0000-0000-0000-000000000004');
select throws_ok($$select updated_by from public.events$$,'42501',null,'members cannot read the editor id');
select is(public.event_updated_by('72000000-0000-0000-0000-000000000001'),null,'a member gets no editor name');
select pg_temp.act_as('70000000-0000-0000-0000-000000000001');
select is((public.event_updated_by('72000000-0000-0000-0000-000000000001')->>'name'),'Edi Editor','the assigned manager sees who edited last');
select pg_temp.act_as('70000000-0000-0000-0000-000000000002');
select is(public.event_updated_by('72000000-0000-0000-0000-000000000001'),null,'an unassigned manager does not');

-- ───────────── Availability of hidden events (A4), read time kept (A5) ─────────────
select pg_temp.visitor();
select is((select count(*)::integer from public.application_availability(array['72000000-0000-0000-0000-000000000002']::uuid[])),1,'a hidden event reports its availability by address');
select pg_temp.act_as('70000000-0000-0000-0000-000000000003');
select lives_ok($$select public.mark_application_read((select id from public.applications where email = 'ana@test.mk'),'2026-01-01 10:00+00')$$,'editor marks an application read');
select lives_ok($$select public.mark_application_read((select id from public.applications where email = 'ana@test.mk'),'2026-02-02 10:00+00')$$,'editor marks it read again');
select is((select read_at from public.applications where email = 'ana@test.mk'),'2026-01-01 10:00+00'::timestamptz,'the first read time is kept');

-- ───────────── Slug helpers (A7) ─────────────
select is(public.slug_taken('ai-at-the-edge'),true,'a current slug is taken');
select is(public.slug_taken('ai-at-the-edge','72000000-0000-0000-0000-000000000001'),false,'the event itself may keep its slug');
select is(public.slug_taken('old-name'),true,'a former slug is taken by redirects');
select is(public.slug_taken('fresh-name'),false,'an unused slug is free');
select pg_temp.act_as('70000000-0000-0000-0000-000000000004');
select throws_ok($$select public.slug_taken('fresh-name')$$,'42501',null,'members cannot probe slugs');
select pg_temp.visitor();
select is((public.resolve_event_address('old-name')->>'is_current')::boolean,false,'a former slug resolves, not as current');
select is(public.resolve_event_address('nope'),null,'an unknown slug resolves to nothing');

-- ───────────── New rows go last (A11) ─────────────
select pg_temp.act_as('70000000-0000-0000-0000-000000000003');
select lives_ok($$insert into public.event_types(name) values ('{"mk":"Talk"}')$$,'editor adds an event type without an order');
select is((select sort_order from public.event_types where name->>'mk' = 'Talk'),6,'it goes after the last one');
select lives_ok($$insert into public.event_types(name,sort_order) values ('{"mk":"First"}',0)$$,'an explicit 0 is accepted');
select is((select sort_order from public.event_types where name->>'mk' = 'First'),0,'an explicit 0 is kept');

-- ───────────── Committees (A13), social links (A18) ─────────────
reset role;
select throws_ok($$delete from public.committees where is_home$$,'23503',null,'the home committee cannot be deleted');
select pg_temp.act_as('70000000-0000-0000-0000-000000000003');
select is(public.import_committees('[{"name":"belgrade","city":{"mk":"Beograd"},"country":"RS","status":"observer","lat":44.8,"lng":20.4},{"name":"Zagreb","city":{"mk":"Zagreb"},"country":"HR","status":"lc","lat":45.8,"lng":16}]'),
  '{"created":1,"updated":1}'::jsonb,'import creates new committees and updates existing ones by name and country');
reset role;
select throws_ok($$insert into public.social_links(platform,url) values ('tiktok','https://tiktok.com/x')$$,'23514',null,'only the three social platforms are accepted');

-- ───────────── Media usage (A20) and fee shape (A21) ─────────────
select pg_temp.act_as('70000000-0000-0000-0000-000000000003');
select is((public.media_usage('74000000-0000-0000-0000-000000000001')->>'sponsors')::integer,1,'media usage counts the sponsor logo');
select is((public.media_usage('74000000-0000-0000-0000-000000000002')->>'total')::integer,0,'an unused file has no usage');
select pg_temp.act_as('70000000-0000-0000-0000-000000000001');
select throws_ok($$select public.media_usage('74000000-0000-0000-0000-000000000001')$$,'42501',null,'event managers cannot run the staff usage check');
reset role;
select is((select fee->'price'->>'mk' from public.events where slug = 'ai-at-the-edge'),'','events without a fee get the price and note shape');
select pg_temp.visitor();
select throws_ok($$select public.is_event_manager_of('72000000-0000-0000-0000-000000000001')$$,'42501',null,'visitors cannot call the manager helper');

select * from finish();
rollback;
