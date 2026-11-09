begin;
select plan(38);
insert into auth.users(id,aud,role,email,email_confirmed_at) values
 ('30000000-0000-0000-0000-000000000001','authenticated','authenticated','editor@test.mk',now()),
 ('30000000-0000-0000-0000-000000000002','authenticated','authenticated','manager@test.mk',now()),
 ('30000000-0000-0000-0000-000000000003','authenticated','authenticated','other@test.mk',now()),
 ('30000000-0000-0000-0000-000000000004','authenticated','authenticated','member@test.mk',now());
insert into public.admin_roles(user_id,role) values
 ('30000000-0000-0000-0000-000000000001','editor'),
 ('30000000-0000-0000-0000-000000000002','event_manager'),
 ('30000000-0000-0000-0000-000000000003','event_manager');
insert into public.event_types(id,name) values ('31000000-0000-0000-0000-000000000001','{"mk":"Workshop"}');
insert into public.sponsor_tiers(id,name,size) values ('31000000-0000-0000-0000-000000000002','{"mk":"Tier"}','small');
insert into public.events(id,slug,title,short_description,scope,type_id,starts_at,ends_at,location,city,country,description,requirements,seo_title,seo_description,status,applications_enabled,admission,max_participants,waitlist,deadline)
values
 ('32000000-0000-0000-0000-000000000001','listed','{"mk":"Listed"}','{"mk":"Short"}','local','31000000-0000-0000-0000-000000000001',now()+interval '1 day',now()+interval '2 days','{"mk":"Here"}','{"mk":"City"}','{"mk":"MK"}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','published',true,'first_come',1,true,now()+interval '12 hours'),
 ('32000000-0000-0000-0000-000000000002','secret','{"mk":"Hidden"}','{"mk":"Short"}','local','31000000-0000-0000-0000-000000000001',now()+interval '1 day',now()+interval '2 days','{"mk":"Here"}','{"mk":"City"}','{"mk":"MK"}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','hidden',true,'selection',1,true,now()+interval '12 hours'),
 ('32000000-0000-0000-0000-000000000003','draft','{"mk":"Draft"}','{"mk":""}','local','31000000-0000-0000-0000-000000000001',now()+interval '1 day',now()+interval '2 days','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','draft',false,'selection',1,true,null);
insert into public.event_managers(event_id,user_id) values ('32000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002');
create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims',json_build_object('sub',p_uid,'role','authenticated','aal','aal1')::text,true); set local role authenticated;
end $$;
create function pg_temp.visitor() returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims','{"role":"anon"}',true); set local role anon;
end $$;
create function pg_temp.submit_application(p_event uuid,p_name text,p_email text,p_answers jsonb,p_locale text,p_consent boolean) returns jsonb
language sql security definer set search_path = '' as $$
  select public.submit_application(p_event,p_name,p_email,p_answers,p_locale,p_consent)
$$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select pg_temp.visitor();
select throws_ok($$select public.submit_application('32000000-0000-0000-0000-000000000001','Attack','a@test.mk','{}','en',true)$$,'42501',null,'public callers cannot bypass the server spam guard');
select is((select count(*)::integer from public.events),1,'visitor lists only the published event');
select is(public.event_by_slug('secret')->>'slug','secret','hidden event is reachable by exact slug');
select is(public.application_form_by_slug('secret')->>'event_id','32000000-0000-0000-0000-000000000002','hidden event form is reachable by exact slug');
select is(public.event_by_slug('draft'),null,'draft is not reachable by slug');
select is(public.application_form_by_slug('draft'),null,'draft form is not reachable by slug');
select throws_ok($$insert into public.applications(event_id,reference,name,email,status,locale) values ('32000000-0000-0000-0000-000000000001','x','x','x','pending','en')$$,'42501',null,'visitor cannot insert an application directly');
select throws_ok($$select pg_temp.submit_application('32000000-0000-0000-0000-000000000001','No consent','no@test.mk','{}','en',false)$$,'22023',null,'submission requires consent');
select is(pg_temp.submit_application('32000000-0000-0000-0000-000000000001','One','member@test.mk','{}','en',true)->'application'->>'status','accepted','first application takes the place');
select is(pg_temp.submit_application('32000000-0000-0000-0000-000000000001','Two','two@test.mk','{}','en',true)->'application'->>'status','waitlist','second application waits');
select is(pg_temp.submit_application('32000000-0000-0000-0000-000000000001','Two','TWO@test.mk','{}','en',true)->>'status','duplicate','duplicate email is case insensitive');
select pg_temp.act_as('30000000-0000-0000-0000-000000000003');
select is((select count(*)::integer from public.applications),0,'unassigned manager cannot see applications');
select throws_ok($$select public.set_application_status('32000000-0000-0000-0000-000000000001',array[]::uuid[],'accepted')$$,'42501',null,'unassigned manager cannot change status');
select pg_temp.act_as('30000000-0000-0000-0000-000000000002');
select is((select count(*)::integer from public.applications),2,'assigned manager sees both applications');
select is((public.dashboard_counts() #>> '{openEventApplications,total}')::integer,2,'manager dashboard counts applications for the assigned open event');
select is((public.dashboard_counts() #>> '{openEventApplications,events}')::integer,1,'manager dashboard counts only assigned open events');
select is(public.event_save('32000000-0000-0000-0000-000000000001','{"slug":"renamed"}'),'32000000-0000-0000-0000-000000000001'::uuid,'assigned manager can save event');
select throws_ok($$select public.event_save('32000000-0000-0000-0000-000000000002','{"slug":"bad"}')$$,'42501',null,'manager cannot save another event');
select throws_ok($$select public.event_save(null,'{}')$$,'42501',null,'manager cannot create event');
select pg_temp.visitor();
select is(public.event_by_slug('listed')->>'slug','renamed','old event address resolves to new slug');
select pg_temp.act_as('30000000-0000-0000-0000-000000000001');
select throws_ok($$select public.event_save('32000000-0000-0000-0000-000000000002','{"slug":"listed"}')$$,'23505',null,'old address cannot be reused by another event');
select is((select count(*)::integer from public.applications),2,'editor sees applications');
select throws_ok($$insert into public.sponsors(name,tier_id,website_url) values ('Bad URL','31000000-0000-0000-0000-000000000002','http://example.test')$$,'23514',null,'sponsor URLs must use HTTPS');
select isnt(public.event_save(null,jsonb_build_object(
  'slug','new-draft', 'title',jsonb_build_object('mk','Draft'), 'short_description',jsonb_build_object('mk',''),
  'scope','local','type_id','31000000-0000-0000-0000-000000000001','starts_at',now()+interval '1 day','ends_at',now()+interval '2 days',
  'location',jsonb_build_object('mk',''),'city',jsonb_build_object('mk',''),'country',jsonb_build_object('mk',''),
  'description',jsonb_build_object('mk',''),'requirements',jsonb_build_object('mk',''),'seo_title',jsonb_build_object('mk',''),'seo_description',jsonb_build_object('mk','')
)),null::uuid,'editor can create a draft');
select pg_temp.act_as('30000000-0000-0000-0000-000000000004');
select is((select count(*)::integer from public.applications),1,'member sees only the verified-email application');
select is(public.withdraw_application('ffffffff-ffff-ffff-ffff-ffffffffffff'),false,'unknown application cannot be withdrawn');
select is(public.withdraw_application((select id from public.applications limit 1)),true,'verified owner can withdraw their application');
select is((select count(*)::integer from public.applications),0,'withdrawal deletes the application');
select pg_temp.visitor();
select is(pg_temp.submit_application('32000000-0000-0000-0000-000000000001','Three','three@test.mk','{}','en',true)->'application'->>'status','waitlist','a new applicant cannot jump the existing queue');
reset role;
select is((select count(*)::integer from public.applications where status = 'accepted'),0,'a withdrawn place is not automatically filled');
select is((select count(*)::integer from public.applications where status = 'waitlist' and waitlist_position in (1,2)),2,'waitlist stays ordered');
select is(public.reference_suffix(10000),'10000','reference counter does not truncate at five digits');
select is((select count(*)::integer from public.applications where status = 'waitlist'),2,'waitlist remains intact');
delete from public.admin_roles where user_id = '30000000-0000-0000-0000-000000000002';
select pg_temp.act_as('30000000-0000-0000-0000-000000000002');
select is(public.is_event_manager_of('32000000-0000-0000-0000-000000000001'),false,'former manager loses event access');
reset role;
select is((select count(*)::integer from public.event_managers where user_id = '30000000-0000-0000-0000-000000000002'),1,'organizer assignment remains for history');
update public.events set deadline = now()-interval '1 hour' where id = '32000000-0000-0000-0000-000000000001';
insert into public.site_settings(key,value) values ('events','{"autoCloseApplications":false}');
select pg_temp.visitor();
select is(pg_temp.submit_application('32000000-0000-0000-0000-000000000001','Late','late@test.mk','{}','en',true)->>'status','created','deadline permits late applications when auto-close is off');
reset role;
update public.site_settings set value = '{"autoCloseApplications":true}' where key = 'events';
select pg_temp.visitor();
select is(pg_temp.submit_application('32000000-0000-0000-0000-000000000001','Closed','closed@test.mk','{}','en',true)->>'status','closed','auto-close stops applications at deadline');
reset role;
update public.events set starts_at = now()-interval '1 minute' where id = '32000000-0000-0000-0000-000000000001';
update public.site_settings set value = '{"autoCloseApplications":false}' where key = 'events';
select pg_temp.visitor();
select is(pg_temp.submit_application('32000000-0000-0000-0000-000000000001','Started','started@test.mk','{}','en',true)->>'status','closed','event start closes applications even with auto-close off');
select * from finish(); rollback;
