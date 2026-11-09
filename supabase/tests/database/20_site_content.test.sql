-- Site settings and committee permissions, including the super-admin MFA boundary.
begin;
select plan(17);

insert into auth.users (id, aud, role, email) values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'editor@test.mk'),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'super@test.mk'),
  ('10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'manager@test.mk'),
  ('10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'member@test.mk');
insert into public.admin_roles (user_id, role) values
  ('10000000-0000-0000-0000-000000000001', 'editor'),
  ('10000000-0000-0000-0000-000000000002', 'super_admin'),
  ('10000000-0000-0000-0000-000000000003', 'event_manager');
insert into public.site_settings (key, value) values
  ('privacy', '{"mk":"privacy"}'), ('notifications', '{"recipients":["private@test.mk"]}'), ('future_private_key', '{"secret":true}');
insert into public.committees (id, name, city, country, status, lat, lng, is_home) values
  ('20000000-0000-0000-0000-000000000001', 'Skopje', '{"mk":"Skopje"}', 'MK', 'lc', 42, 21, true),
  ('20000000-0000-0000-0000-000000000002', 'Belgrade', '{"mk":"Belgrade"}', 'RS', 'lc', 44, 20, false);

create function pg_temp.act_as(p_uid uuid, p_aal text default 'aal1') returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
  set local role authenticated;
end $$;
create function pg_temp.visitor() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
end $$;
create function pg_temp.changed(p_sql text) returns integer language plpgsql as $$
declare n integer;
begin execute p_sql; get diagnostics n = row_count; return n; end $$;

grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select pg_temp.visitor();
select is((select count(*)::integer from public.site_settings), 1, 'visitors cannot read notification recipients or unknown settings');
select is((select count(*)::integer from public.committees), 2, 'visitors see the map');
select throws_ok($$select public.set_home_committee('20000000-0000-0000-0000-000000000002')$$, '42501', null, 'visitors cannot change the home committee');
select pg_temp.act_as('10000000-0000-0000-0000-000000000004');
select is((select count(*)::integer from public.site_settings where key = 'notifications'), 0, 'a member cannot read notification recipients');
select pg_temp.act_as('10000000-0000-0000-0000-000000000003');
select throws_ok($$select public.set_home_committee('20000000-0000-0000-0000-000000000002')$$, '42501', null, 'an event manager cannot change the map');
select pg_temp.act_as('10000000-0000-0000-0000-000000000001');
select is((select count(*)::integer from public.site_settings where key = 'notifications'), 0, 'an editor cannot read notification recipients');
select throws_ok($$insert into public.page_content (page, content) values ('contact', '{"subjects":[{"routeEmail":"private@test.mk"}]}')$$, '23514', null, 'contact subject routing cannot be embedded in public content');
select is(pg_temp.changed($$update public.site_settings set value = '{"mk":"new"}' where key = 'privacy'$$), 1, 'an editor can edit privacy');
select is(pg_temp.changed($$update public.site_settings set value = '{}' where key = 'notifications'$$), 0, 'an editor cannot edit private settings');
select throws_ok($$update public.committees set is_home = false$$, '42501', null, 'home flag cannot be changed directly');
select is(public.set_home_committee('20000000-0000-0000-0000-000000000099'), false, 'a missing home target is rejected');
select is((select count(*)::integer from public.committees where is_home), 1, 'the old home remains when target is missing');
select is(public.set_home_committee('20000000-0000-0000-0000-000000000002'), true, 'an editor can move the home flag');
select is(pg_temp.changed($$delete from public.committees where is_home$$), 0, 'the home committee cannot be deleted');
select pg_temp.act_as('10000000-0000-0000-0000-000000000002');
select is((select count(*)::integer from public.site_settings where key = 'notifications'), 0, 'super admin without two-step cannot read private settings');
select pg_temp.act_as('10000000-0000-0000-0000-000000000002', 'aal2');
select is((select count(*)::integer from public.site_settings where key = 'notifications'), 1, 'super admin with two-step can read private settings');
select is((select count(*)::integer from public.site_settings where key = 'future_private_key'), 1, 'super admin can read unknown settings without publishing them');
select * from finish();
rollback;
