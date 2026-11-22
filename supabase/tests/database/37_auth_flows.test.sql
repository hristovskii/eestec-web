-- Registration and e-mail links: for the server only, one use per link, an address per person.
begin;
\ir ../helpers/isolate.inc
select plan(20);
insert into auth.users(id,aud,role,email,email_confirmed_at) values
 ('a0000000-0000-0000-0000-000000000001','authenticated','authenticated','one@test.mk',null),
 ('a0000000-0000-0000-0000-000000000002','authenticated','authenticated','two@test.mk',null),
 ('a0000000-0000-0000-0000-000000000003','authenticated','authenticated','three@test.mk',now());
create function pg_temp.as_role(p_role text) returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims', json_build_object('role', p_role)::text, true); execute format('set local role %I', p_role);
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

-- Nobody but the server calls these.
select pg_temp.as_role('anon');
select throws_ok($$select public.auth_user_state('one@test.mk')$$, '42501', null, 'a visitor cannot look up an address');
select throws_ok($$select public.auth_link_use('x', 'confirm', now())$$, '42501', null, 'or use a link');
select pg_temp.as_role('authenticated');
select throws_ok($$select public.register_member('a0000000-0000-0000-0000-000000000001','Ana Test','ana-test','FEEIT','2','','members','mk',now())$$, '42501', null, 'a signed-in person cannot register someone');
select throws_ok($$select public.auth_link_issue('a0000000-0000-0000-0000-000000000001','confirm','h',now()+interval '1 day')$$, '42501', null, 'or make a link');
select throws_ok($$select public.password_reset_done('a0000000-0000-0000-0000-000000000001', now())$$, '42501', null, 'or end sessions');
select throws_ok($$select * from public.auth_links$$, '42501', null, 'and the links table stays closed');

select pg_temp.as_role('service_role');
select is((public.auth_user_state('ONE@test.mk') ->> 'confirmed')::boolean, false, 'an address is found in any case, and is not confirmed');
select is((public.auth_user_state('three@test.mk') ->> 'confirmed')::boolean, true, 'a confirmed one says so');
select is(public.auth_user_state('nobody@test.mk'), null, 'an unknown address is nothing');

-- Registration.
select is(public.register_member('a0000000-0000-0000-0000-000000000001','Ana Test','ana-test','FEEIT','2','070','members','en','2026-10-05T08:00:00Z') ->> 'username', 'ana-test', 'the profile address is the one asked for');
select is(public.register_member('a0000000-0000-0000-0000-000000000002','Ana Test','ana-test','FINKI','1','','public','mk','2026-10-05T08:00:00Z') ->> 'username', 'ana-test-2', 'a taken one gets a number');
select is((select status::text || '/' || visibility::text from public.profiles where id = 'a0000000-0000-0000-0000-000000000002'), 'pending/public', 'a new profile waits for the board');
select is((select registration_locale || '/' || faculty from public.member_accounts where profile_id = 'a0000000-0000-0000-0000-000000000001'), 'en/FEEIT', 'the private row keeps the language and the faculty');
select throws_ok($$select public.register_member('a0000000-0000-0000-0000-000000000002','Ana Test','ana-test','FEEIT','9','','members','mk',now())$$, '22023', null, 'a year that does not exist is refused');
select throws_ok($$select public.register_member('a0000000-0000-0000-0000-000000000001','X','ana-x','FEEIT','2','','members','mk',now())$$, '23514', null, 'a one-letter name breaks the profile rule (and is not retried as an address)');

-- Links.
select lives_ok($$select public.auth_link_issue('a0000000-0000-0000-0000-000000000001','confirm','hash-a',now()+interval '1 day')$$, 'a link is stored by its hash');
select is(public.auth_link_peek('hash-a','confirm',now()) ->> 'state', 'valid', 'it is valid until it is used or old');
select is(public.auth_link_peek('hash-a','reset',now()) ->> 'state', 'invalid', 'as another kind it is not a link at all');
select is(public.auth_link_use('hash-a','confirm',now()), 'a0000000-0000-0000-0000-000000000001'::uuid, 'using it gives the person');
select is(public.auth_link_use('hash-a','confirm',now()), null, 'and only once');
select * from finish(); rollback;
