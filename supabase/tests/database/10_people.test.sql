-- Profiles, accounts, teams, board, media and the functions around them, per role.
begin;
select plan(38);

-- ───────────── Who is who ─────────────
-- ana    active, public            bojan  active, members only      cara   pending, e-mail confirmed
-- dino   alumni, public            hana   hidden                    ed     event manager (no profile)
-- edi    editor (no profile)       sup    super admin (no profile)  mem    plain member via ana's account
insert into auth.users (id, aud, role, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'ana@test.mk', now()),
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'bojan@test.mk', now()),
  ('00000000-0000-0000-0000-0000000000a3', 'authenticated', 'authenticated', 'cara@test.mk', now()),
  ('00000000-0000-0000-0000-0000000000a4', 'authenticated', 'authenticated', 'dino@test.mk', now()),
  ('00000000-0000-0000-0000-0000000000a5', 'authenticated', 'authenticated', 'hana@test.mk', now()),
  ('00000000-0000-0000-0000-0000000000e1', 'authenticated', 'authenticated', 'ed@test.mk', now()),
  ('00000000-0000-0000-0000-0000000000e2', 'authenticated', 'authenticated', 'edi@test.mk', now()),
  ('00000000-0000-0000-0000-0000000000e3', 'authenticated', 'authenticated', 'sup@test.mk', now());

insert into public.profiles (id, username, full_name, visibility, status, member_since, bio) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana', 'Ana Test', 'public', 'active', '2023-10-01', 'Ana bio'),
  ('00000000-0000-0000-0000-0000000000a2', 'bojan', 'Bojan Test', 'members_only', 'active', '2024-10-01', 'Bojan bio'),
  ('00000000-0000-0000-0000-0000000000a3', 'cara', 'Cara Test', 'members_only', 'pending', null, ''),
  ('00000000-0000-0000-0000-0000000000a4', 'dino', 'Dino Test', 'public', 'alumni', '2019-10-01', 'Dino bio'),
  ('00000000-0000-0000-0000-0000000000a5', 'hana', 'Hana Test', 'public', 'hidden', '2022-10-01', '');
insert into public.member_accounts (profile_id, data_consent_at, phone) values
  ('00000000-0000-0000-0000-0000000000a1', now(), '+38970111111'),
  ('00000000-0000-0000-0000-0000000000a2', now(), '+38970222222'),
  ('00000000-0000-0000-0000-0000000000a3', now(), '+38970333333');
insert into public.admin_roles (user_id, role, display_name) values
  ('00000000-0000-0000-0000-0000000000e1', 'event_manager', 'Ed Manager'),
  ('00000000-0000-0000-0000-0000000000e2', 'editor', 'Edi Editor'),
  ('00000000-0000-0000-0000-0000000000e3', 'super_admin', 'Sup Admin');

insert into public.teams (id, slug, name, sort_order) values
  ('00000000-0000-0000-0000-00000000b001', 'events', '{"mk": "Events"}', 1);
insert into public.member_teams (profile_id, team_id, role) values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000b001', 'lead');

insert into public.board_roles (id, key, title) values
  ('00000000-0000-0000-0000-00000000c001', 'chair', 'Chair');
insert into public.board_mandates (id, label, starts_on, ends_on) values
  ('00000000-0000-0000-0000-00000000d001', '2025/2026', '2025-09-01', '2026-08-31'),
  ('00000000-0000-0000-0000-00000000d002', '2026/2027', '2026-09-01', '2027-08-31');
insert into public.board_members (mandate_id, board_role_id, role_title_snapshot, profile_id) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000c001', 'Chair', '00000000-0000-0000-0000-0000000000a2');

insert into public.media (id, bucket, path, kind, file_name, uploaded_by) values
  ('00000000-0000-0000-0000-00000000f001', 'public-media', 'a/one.jpg', 'image', 'one.jpg', '00000000-0000-0000-0000-0000000000e2'),
  ('00000000-0000-0000-0000-00000000f002', 'avatars', 'a/ana.jpg', 'image', 'ana.jpg', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-00000000f003', 'public-media', 'a/ed.jpg', 'image', 'ed.jpg', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-00000000f004', 'public-media', 'a/other.jpg', 'image', 'other.jpg', '00000000-0000-0000-0000-0000000000e2');

-- Acts as someone for the rest of the transaction; call reset role to come back.
create function pg_temp.act_as(p_uid uuid, p_aal text default 'aal1') returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
  set local role authenticated;
end
$$;
-- How many rows a statement changed, for a role that should change none.
create function pg_temp.changed(p_sql text) returns integer
language plpgsql as $$
declare n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end
$$;
create function pg_temp.act_as_visitor() returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  set local role anon;
end
$$;

-- ───────────── Visitor ─────────────
select pg_temp.act_as_visitor();
select is((select count(*)::integer from public.profiles), 2, 'a visitor reads the public active and alumni profiles only');
select is((select count(*)::integer from public.profiles where username = 'bojan'), 0, 'a visitor cannot read a members-only profile');
select is(public.members_hidden_count(), 1, 'a visitor is told how many members-only profiles are hidden');
select is((select full_name from public.profile_restricted('Bojan')), 'Bojan Test', 'a visitor gets the restricted page of a members-only member');
select is((select count(*)::integer from public.profile_restricted('cara')), 0, 'a pending person has no restricted page');
select throws_ok($$select * from public.member_accounts$$, '42501', null, 'a visitor cannot read member accounts');
select is(
  public.board_view('2025/2026') #>> '{selected,seats,0,name}', 'Bojan Test',
  'the board shows a members-only person by name to a visitor'
);
select is(
  public.board_view('2025/2026') #>> '{selected,seats,0,username}', null,
  'but without a link to the profile'
);
select is((select count(*)::integer from public.media), 3, 'a visitor lists public-media files and no avatars');
select is((select bio from public.author_cards(array['00000000-0000-0000-0000-0000000000a2']::uuid[])), '', 'an author card hides the bio of a members-only person from a visitor');

-- ───────────── Members ─────────────
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::integer from public.profiles where username = 'bojan'), 1, 'an active member reads a members-only profile');
select is((select count(*)::integer from public.member_accounts), 1, 'a member reads only their own account');
select is(public.members_hidden_count(), 0, 'a member has nothing hidden');
select is((select bio from public.author_cards(array['00000000-0000-0000-0000-0000000000a2']::uuid[])), 'Bojan bio', 'an author card shows the bio to a member');
select throws_ok($$update public.profiles set status = 'alumni' where id = '00000000-0000-0000-0000-0000000000a1'$$, '42501', null, 'a member cannot change their own status');
select lives_ok($$update public.profiles set bio = 'New bio' where id = '00000000-0000-0000-0000-0000000000a1'$$, 'a member edits their own bio');
select is(
  pg_temp.changed($$update public.profiles set bio = 'Hacked' where id = '00000000-0000-0000-0000-0000000000a2'$$),
  0, 'a member cannot edit someone else''s profile'
);
select is((select count(*)::integer from public.media where bucket = 'avatars'), 1, 'a member sees their own avatar row');

-- CV sharing: on stamps the consent; off forgets the file and queues it for removal
update public.member_accounts set cv_opt_in = true where profile_id = '00000000-0000-0000-0000-0000000000a1';
select isnt((select cv_consent_at from public.member_accounts), null, 'turning CV sharing on stamps the consent date');
reset role;
update public.member_accounts set cv_path = 'cvs/ana.pdf', cv_file_name = 'ana.pdf' where profile_id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
update public.member_accounts set cv_opt_in = false where profile_id = '00000000-0000-0000-0000-0000000000a1';
select is((select cv_path from public.member_accounts), null, 'turning CV sharing off clears the file');
reset role;
select is((select count(*)::integer from public.storage_cleanup_queue where path = 'cvs/ana.pdf'), 1, 'and queues the file for removal');

-- A pending member sees their own row and the public ones, not members-only people
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::integer from public.profiles), 3, 'a pending member counts as a visitor, plus their own row');

-- ───────────── Staff ─────────────
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
select is((select count(*)::integer from public.profiles where username = 'bojan'), 1, 'an event manager reads members-only profiles');
select throws_ok($$select public.admin_save_member('00000000-0000-0000-0000-0000000000a1', '{"status": "alumni"}')$$, '42501', null, 'an event manager cannot edit members');
select is((select count(*)::integer from public.media), 3, 'an event manager reads public files and their own');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e2');
select is(
  public.admin_save_member('00000000-0000-0000-0000-0000000000a1',
    '{"status": "alumni", "member_since": "2023-10-01", "active_to": "2026-06-30", "alumni_now": {"mk": "Engineer"}, "teams": [{"team_id": "00000000-0000-0000-0000-00000000b001", "role": "member"}], "badges": []}'),
  true, 'an editor saves a member'
);
select is((select count(*)::integer from public.member_teams where profile_id = '00000000-0000-0000-0000-0000000000a1'), 1, 'with the team');
select is((select count(*)::integer from public.member_accounts), 3, 'an editor reads every member account');
select throws_ok($$insert into public.board_roles (key, title) values ('x', 'X')$$, '42501', null, 'an editor cannot edit board roles (Settings)');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e3');
select is((select count(*)::integer from public.admin_roles), 1, 'a super admin without a 2-step session sees only their own role');
select throws_ok($$select public.admin_save_member('00000000-0000-0000-0000-0000000000a1', '{"status": "active"}')$$, '42501', null, 'and is not staff');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e3', 'aal2');
select is((select count(*)::integer from public.admin_roles), 3, 'with a 2-step session a super admin manages admin roles');

-- Board: the first board became current; one moves the flag, the current one cannot be deleted
select is((select label from public.board_mandates where is_current), '2025/2026', 'the first board made is the current one');
select is(public.set_current_mandate('00000000-0000-0000-0000-00000000d002'), true, 'a board is marked current');
select is((select count(*)::integer from public.board_mandates where is_current), 1, 'exactly one board is current');
select throws_ok($$delete from public.board_mandates where label = '2026/2027'$$, '23503', null, 'the current board cannot be deleted');

-- Approvals: only confirmed, pending people; a second decision finds them decided
select is(
  (public.decide_member_registrations(array['00000000-0000-0000-0000-0000000000a3']::uuid[], 'approve') -> 'decided' ->> 0)::uuid,
  '00000000-0000-0000-0000-0000000000a3'::uuid, 'approving a pending member decides them'
);
select is(
  public.decide_member_registrations(array['00000000-0000-0000-0000-0000000000a3']::uuid[], 'approve') -> 'already_decided' ->> 0,
  '00000000-0000-0000-0000-0000000000a3', 'a second decision says already decided'
);

select * from finish();
rollback;
