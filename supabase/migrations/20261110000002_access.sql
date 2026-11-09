-- eestec.mk · M19a · who may do what: role helpers, row-level security, grants, triggers.
--
-- Helpers are security definer with an empty search_path so policies can read admin_roles and profiles
-- without recursing into their own policies. They are granted to the roles that call them.

-- ───────────── Role helpers ─────────────
-- The admin role of the signed-in user. A super admin counts only with a 2-step session (aal2, D12).
create function public.current_admin_role() returns public.admin_role
language sql stable security definer set search_path = '' as $$
  select case
    when r.role = 'super_admin' and coalesce((select auth.jwt()) ->> 'aal', '') <> 'aal2' then null
    else r.role
  end
  from public.admin_roles r
  where r.user_id = (select auth.uid())
$$;

create function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_admin_role() = 'super_admin', false)
$$;

-- Super admin and editor: everything except Settings and Admin users (D18).
create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_admin_role() in ('super_admin', 'editor'), false)
$$;

create function public.is_active_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status in ('active', 'alumni')
  )
$$;

-- "Member" for visibility: an active or alumni member, or anyone who can open the admin.
-- A pending member counts as a visitor.
create function public.is_member_audience() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_member() or public.current_admin_role() is not null
$$;

grant execute on function
  public.current_admin_role(), public.is_super_admin(), public.is_staff(),
  public.is_active_member(), public.is_member_audience(), public.is_localized(jsonb)
  to anon, authenticated;

-- ───────────── Row-level security on every table ─────────────
alter table public.storage_cleanup_queue enable row level security;
alter table public.media enable row level security;
alter table public.admin_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.member_accounts enable row level security;
alter table public.teams enable row level security;
alter table public.member_teams enable row level security;
alter table public.badges enable row level security;
alter table public.member_badges enable row level security;
alter table public.board_roles enable row level security;
alter table public.board_mandates enable row level security;
alter table public.board_members enable row level security;
alter table public.auth_links enable row level security;
alter table public.login_lockouts enable row level security;
alter table public.mfa_backup_codes enable row level security;
-- storage_cleanup_queue, auth_links, login_lockouts and mfa_backup_codes have no policy and no grant:
-- only the service role (server code and jobs) reaches them.

-- ── media ── metadata of public files is public; avatars are listed to their owner and staff only
grant select on public.media to anon, authenticated;
grant insert, update, delete on public.media to authenticated;

create policy "media: public files are readable" on public.media for select
  using (status = 'ready' and bucket in ('public-media', 'documents'));
create policy "media: own uploads are readable" on public.media for select to authenticated
  using (uploaded_by = (select auth.uid()));
create policy "media: staff read everything" on public.media for select to authenticated
  using (public.is_staff());
create policy "media: staff write everything" on public.media for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
-- Event managers upload and manage their own files (D18); more policies for events come with M19b.
create policy "media: event managers add their own" on public.media for insert to authenticated
  with check (public.current_admin_role() = 'event_manager' and uploaded_by = (select auth.uid()));
create policy "media: event managers change their own" on public.media for update to authenticated
  using (public.current_admin_role() = 'event_manager' and uploaded_by = (select auth.uid()))
  with check (public.current_admin_role() = 'event_manager' and uploaded_by = (select auth.uid()));
create policy "media: event managers delete their own" on public.media for delete to authenticated
  using (public.current_admin_role() = 'event_manager' and uploaded_by = (select auth.uid()));

-- ── admin_roles ── a person sees their own role; Admin users & roles is the super admin's
grant select, insert, update, delete on public.admin_roles to authenticated;
create policy "admin_roles: see your own" on public.admin_roles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "admin_roles: super admin manages all" on public.admin_roles for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ── profiles ──
-- Rows a viewer may read: their own; for staff all; active and alumni members that are public,
-- or members-only for the member audience. Visitors learn a members-only person through
-- profile_restricted() and the board through board_view(), never through a select.
grant select on public.profiles to anon, authenticated;
create policy "profiles: public ones for everyone" on public.profiles for select
  using (status in ('active', 'alumni') and visibility = 'public');
create policy "profiles: members see members-only ones" on public.profiles for select to authenticated
  using (status in ('active', 'alumni') and public.is_member_audience());
create policy "profiles: see your own" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles: staff see all" on public.profiles for select to authenticated
  using (public.is_staff());

-- A person edits only what the profile page offers. Status, dates, moderation flags and everything
-- else change through the admin functions (security definer) or the service role.
grant update (username, full_name, photo_media_id, bio, linkedin_url, github_url, visibility)
  on public.profiles to authenticated;
create policy "profiles: edit your own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ── member_accounts ── private: the owner and staff
grant select on public.member_accounts to authenticated;
create policy "member_accounts: see your own" on public.member_accounts for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "member_accounts: staff see all" on public.member_accounts for select to authenticated
  using (public.is_staff());

grant update (faculty, year_of_study, phone, newsletter_opt_in, gallery_name_opt_in, cv_opt_in)
  on public.member_accounts to authenticated;
create policy "member_accounts: edit your own" on public.member_accounts for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- Turning CV sharing on stamps the consent; turning it off forgets the file at once and queues it for removal.
create function public.member_accounts_cv_rules() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.cv_opt_in and not old.cv_opt_in then
    new.cv_consent_at = now();
  elsif not new.cv_opt_in and old.cv_opt_in then
    new.cv_consent_at = null;
    if old.cv_path is not null then
      insert into public.storage_cleanup_queue (bucket, path, reason) values ('cvs', old.cv_path, 'cv opt-out');
    end if;
    new.cv_path = null;
    new.cv_file_name = null;
    new.cv_size = null;
    new.cv_uploaded_at = null;
  end if;
  return new;
end
$$;
create trigger member_accounts_cv_rules before update of cv_opt_in on public.member_accounts
  for each row execute function public.member_accounts_cv_rules();

-- ── teams, badges ── public lists; staff change them
grant select on public.teams, public.badges to anon, authenticated;
grant insert, update, delete on public.teams, public.badges to authenticated;
create policy "teams: everyone reads" on public.teams for select using (true);
create policy "teams: staff write" on public.teams for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "badges: everyone reads" on public.badges for select using (true);
create policy "badges: staff write" on public.badges for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Who is in a team or has a badge follows the profile: a row is readable when its profile is.
grant select on public.member_teams, public.member_badges to anon, authenticated;
grant insert, update, delete on public.member_teams, public.member_badges to authenticated;
create policy "member_teams: readable with the profile" on public.member_teams for select
  using (exists (select 1 from public.profiles p where p.id = member_teams.profile_id));
create policy "member_teams: staff write" on public.member_teams for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "member_badges: readable with the profile" on public.member_badges for select
  using (exists (select 1 from public.profiles p where p.id = member_badges.profile_id));
create policy "member_badges: staff write" on public.member_badges for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── board ── the board is public; roles are edited in Settings (super admin), seats in Members (staff)
grant select on public.board_roles, public.board_mandates, public.board_members to anon, authenticated;
grant insert, update, delete on public.board_roles, public.board_mandates, public.board_members to authenticated;
create policy "board_roles: everyone reads" on public.board_roles for select using (true);
create policy "board_roles: super admin writes" on public.board_roles for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy "board_mandates: everyone reads" on public.board_mandates for select using (true);
create policy "board_mandates: staff write" on public.board_mandates for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "board_members: everyone reads" on public.board_members for select using (true);
create policy "board_members: staff write" on public.board_members for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- A board that is current cannot be deleted or un-marked; the first board becomes current.
create function public.board_mandates_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.is_current then
      raise exception 'The current board cannot be deleted' using errcode = '23503';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.is_current and not new.is_current
     and exists (select 1 from public.board_mandates m where m.id <> old.id) then
    -- allowed only while another one is being made current in the same transaction (set_current_mandate)
    if coalesce(current_setting('eestec.moving_current', true), '') <> 'on' then
      raise exception 'Mark another board as current instead' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'INSERT' and not exists (select 1 from public.board_mandates) then
    new.is_current = true;
  end if;
  return new;
end
$$;
create trigger board_mandates_guard before insert or update of is_current or delete on public.board_mandates
  for each row execute function public.board_mandates_guard();

-- auth_links, login_lockouts, mfa_backup_codes and storage_cleanup_queue: RLS on, no policy and no grant
-- to anon or authenticated (service role and security definer functions only).
