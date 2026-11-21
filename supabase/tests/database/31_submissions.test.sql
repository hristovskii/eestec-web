-- Anonymous privacy, service-only writes, role-filtered feedback and the shared device limit.
begin;
\ir ../helpers/isolate.inc
select plan(24);
insert into auth.users(id,aud,role,email) values
 ('90000000-0000-0000-0000-000000000001','authenticated','authenticated','manager@test.mk'),
 ('90000000-0000-0000-0000-000000000002','authenticated','authenticated','other@test.mk'),
 ('90000000-0000-0000-0000-000000000003','authenticated','authenticated','editor@test.mk');
insert into public.admin_roles(user_id,role) values
 ('90000000-0000-0000-0000-000000000001','event_manager'),('90000000-0000-0000-0000-000000000002','event_manager'),
 ('90000000-0000-0000-0000-000000000003','editor');
insert into public.event_types(id,name) values ('91000000-0000-0000-0000-000000000001','{"mk":"Type"}');
insert into public.events(id,slug,title,short_description,scope,type_id,starts_at,ends_at,location,city,country,description,requirements,seo_title,seo_description,status)
values ('92000000-0000-0000-0000-000000000001','feedback-event','{"mk":"Event"}','{"mk":"Short"}','local','91000000-0000-0000-0000-000000000001',now(),now()+interval '1 day','{"mk":"Here"}','{"mk":"City"}','{"mk":"MK"}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','published');
insert into public.event_managers(event_id,user_id) values ('92000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001');
insert into public.idea_types(id,name) values ('93000000-0000-0000-0000-000000000001','{"mk":"Idea"}');
create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims',json_build_object('sub',p_uid,'role','authenticated','aal','aal1')::text,true); set local role authenticated;
end $$;
create function pg_temp.visitor() returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims','{"role":"anon"}',true); set local role anon;
end $$;
grant execute on all functions in schema pg_temp to anon,authenticated,service_role;
select pg_temp.visitor();
select throws_ok($$select public.rate_limit_hit(repeat('a',64))$$,'42501',null,'visitor cannot call rate limiter');
select throws_ok($$select public.submit_idea('93000000-0000-0000-0000-000000000001','Title','Body','en',true,'Name','email',null,false)$$,'42501',null,'visitor cannot bypass submission checks');
reset role; set local role service_role;
select is((public.rate_limit_hit(repeat('a',64))->>'allowed')::boolean,true,'first hit is permitted');
select public.rate_limit_hit(repeat('a',64));
select public.rate_limit_hit(repeat('a',64));
select public.rate_limit_hit(repeat('a',64));
select is((public.rate_limit_hit(repeat('a',64))->>'remaining')::integer,0,'fifth hit exhausts the shared quota');
select is((public.rate_limit_hit(repeat('a',64))->>'allowed')::boolean,false,'sixth hit is blocked');
select isnt(public.rate_limit_hit(repeat('a',64))->>'retryAt',null,'blocked result says when to retry');
select isnt(public.submit_idea('93000000-0000-0000-0000-000000000001','Title','Body','en',true,'Name','email','ffffffff-ffff-ffff-ffff-ffffffffffff',true)->>'id',null,'anonymous idea ignores supplied identity');
select isnt(public.submit_impression('92000000-0000-0000-0000-000000000001','','Event',null,'Anonymous feedback','en',true,'Name','email',null,true)->>'id',null,'anonymous feedback allows no rating');
reset role;
select is((select count(*)::integer from public.submission_log),5,'blocked attempts are not recorded');
select is((select count(*)::integer from public.ideas where is_anonymous and name is null and email is null and user_id is null and consent_at is null),1,'anonymous idea stores no identity or consent');
select is((select count(*)::integer from public.feedback where is_anonymous and name is null and email is null and user_id is null and consent_at is null),1,'anonymous feedback stores no identity or consent');
select pg_temp.act_as('90000000-0000-0000-0000-000000000001');
select is((select count(*)::integer from public.feedback),0,'manager cannot read raw feedback');
select is((select count(*)::integer from public.event_feedback_for_manager('92000000-0000-0000-0000-000000000001')),1,'assigned manager sees restricted feedback');
select pg_temp.act_as('90000000-0000-0000-0000-000000000002');
select throws_ok($$select * from public.event_feedback_for_manager('92000000-0000-0000-0000-000000000001')$$,'42501',null,'unassigned manager cannot view feedback');
select pg_temp.act_as('90000000-0000-0000-0000-000000000003');
select is((select count(*)::integer from public.ideas),1,'editor sees ideas');
-- Ratings: per site event and per free-text event, role-filtered; accepting an idea records who did it.
reset role; set local role service_role;
select isnt(public.submit_impression('92000000-0000-0000-0000-000000000001','','Event',5,'Great workshop','en',true,null,null,null,false)->>'id',null,'a rated impression is stored');
select isnt(public.submit_impression(null,'Other Fest','Other Fest',3,'','en',true,null,null,null,false)->>'id',null,'a rating for another event is stored');
select pg_temp.act_as('90000000-0000-0000-0000-000000000003');
select is((select count(*)::integer from public.event_ratings(null,null)),2,'editor sees a rating row per event, including free-text ones');
select is((select latest_comment from public.event_ratings(null,null) where event_id is not null),'Great workshop','the latest comment travels with the rating');
select is((select other_key from public.event_ratings(null,null) where event_id is null),'other fest','free-text events are keyed by their normalised name');
select pg_temp.act_as('90000000-0000-0000-0000-000000000001');
select is((select count(*)::integer from public.event_ratings(null,null)),1,'assigned manager sees only their own event rating');
select pg_temp.act_as('90000000-0000-0000-0000-000000000002');
select is((select count(*)::integer from public.event_ratings(null,null)),0,'unassigned manager sees no ratings');
select pg_temp.act_as('90000000-0000-0000-0000-000000000003');
select is(public.accept_idea((select id from public.ideas limit 1),'{"slug":"from-idea","title":{"mk":"From idea"},"short_description":{"mk":""},"scope":"local","type_id":"91000000-0000-0000-0000-000000000001","starts_at":"2030-01-01T10:00:00Z","ends_at":"2030-01-02T10:00:00Z","location":{"mk":""},"city":{"mk":""},"country":{"mk":""},"description":{"mk":""},"requirements":{"mk":""},"seo_title":{"mk":""},"seo_description":{"mk":""}}'::jsonb) is not null,true,'editor turns an idea into a draft event');
select is((select owner_name from public.ideas limit 1),'editor@test.mk','the accepting editor is named as owner');
select * from finish(); rollback;
