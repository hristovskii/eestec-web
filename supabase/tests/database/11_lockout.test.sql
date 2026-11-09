-- Sign-in lockout and the tables only the server reaches.
begin;
select plan(8);

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'ana@test.mk');

select is((public.login_gate('Ana@Test.mk') ->> 'attempts_left')::integer, 5, 'a fresh address has 5 attempts');
select public.login_record('ana@test.mk', false);
select public.login_record(' ANA@test.mk ', false);
select is((public.login_gate('ana@test.mk') ->> 'attempts_left')::integer, 3, 'failures count whatever the case or spacing of the address');
select public.login_record('ana@test.mk', false);
select public.login_record('ana@test.mk', false);
select is((public.login_record('ana@test.mk', false) ->> 'locked')::boolean, true, 'the 5th failure locks the address');
select is((public.login_gate('ana@test.mk') ->> 'locked')::boolean, true, 'the gate says locked');
select is((public.login_gate('nobody@test.mk') ->> 'attempts_left')::integer, 5, 'an unknown address behaves like a known one');

update public.login_lockouts set locked_until = now() - interval '1 minute' where email_key = 'ana@test.mk';
select public.login_record('ana@test.mk', true);
select is((public.login_gate('ana@test.mk') ->> 'attempts_left')::integer, 5, 'after the pause a success forgets the failures');

set local role authenticated;
select throws_ok($$select public.login_gate('ana@test.mk')$$, '42501', null, 'a signed-in user cannot call the gate');
select throws_ok($$select * from public.auth_links$$, '42501', null, 'nor read the e-mail links');

select * from finish();
rollback;
