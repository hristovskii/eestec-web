-- Functions added while building the Supabase repositories (M20): who may call them and what they return.
begin;
\ir ../helpers/isolate.inc
select plan(22);
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
select * from finish();
rollback;
