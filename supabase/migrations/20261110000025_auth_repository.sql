-- M20i: what the auth repository (the part that needs no sign-in flow yet) and the account-deletion port need from SQL.
-- The sign-in, reset, 2-step and invite flows are M21; everything here only reads or changes what already exists.

-- ───────────── Who is signed in ─────────────
-- The session as the app needs it, in one read: the account, the member profile (if any), the board role as the access
-- rules see it (`current_admin_role()`: a super admin counts only at aal2) and the events an event manager looks after.
-- null: nobody is signed in, or the account is being deleted (its token must not regain anything, see 0010).
create function public.my_session() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null or public.account_deletion_pending(uid) then return null; end if;
  return (
    select jsonb_build_object(
      'user_id', u.id,
      'email', u.email,
      'name', coalesce(p.full_name, nullif(r.display_name, ''), u.email),
      'username', coalesce(p.username, ''),
      'member_status', p.status,
      'member_since', coalesce(p.member_since, (p.created_at at time zone 'Europe/Skopje')::date),
      'admin_role', public.current_admin_role(),
      'managed_event_ids', coalesce((select jsonb_agg(m.event_id order by m.event_id)
        from public.event_managers m where m.user_id = u.id), '[]'::jsonb),
      'teams', coalesce((select jsonb_agg(t.name order by t.sort_order)
        from public.member_teams mt join public.teams t on t.id = mt.team_id where mt.profile_id = u.id), '[]'::jsonb))
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.admin_roles r on r.user_id = u.id
    where u.id = uid);
end $$;
grant execute on function public.my_session() to authenticated;

-- ───────────── Approvals › Member registrations ─────────────
-- What a person entered when they created the account, with the e-mail that lives in Auth. Staff see everyone; a person
-- sees their own. `status`: awaiting_confirmation (the e-mail link was not used yet), pending (confirmed, waiting for the
-- board), active (approved) or rejected. Oldest first. A photo is described by its path, never linked.
create function public.member_registrations(p_user uuid default null, p_status text default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.submitted_at, r.user_id), '[]'::jsonb)
  from (
    select p.id as user_id, p.full_name as name, u.email, a.faculty, coalesce(a.year_of_study, '1') as year, a.phone,
      case p.visibility when 'public' then 'public' else 'members' end as visibility,
      (select m.path from public.media m where m.id = p.photo_media_id and m.bucket = 'avatars') as photo_path,
      case when p.status = 'rejected' then 'rejected'
           when p.status = 'pending' then case when u.email_confirmed_at is null then 'awaiting_confirmation' else 'pending' end
           else 'active' end as status,
      a.registration_locale as locale,
      coalesce(a.data_consent_at, p.created_at) as submitted_at,
      u.email_confirmed_at as confirmed_at, a.decided_at, a.rejection_reason
    from public.profiles p
    join public.member_accounts a on a.profile_id = p.id
    join auth.users u on u.id = p.id
    where (public.is_staff() or p.id = (select auth.uid())) and (p_user is null or p.id = p_user)
  ) r
  where p_status is null or r.status = p_status
$$;
grant execute on function public.member_registrations(uuid, text) to authenticated;

-- ───────────── My account ─────────────
-- The private facts of one account: the e-mail (Auth), phone, year and consent date. Their own, or staff.
create function public.account_details(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('email', u.email, 'phone', a.phone, 'year', a.year_of_study,
    'data_consent_at', a.data_consent_at, 'password_changed_at', a.password_changed_at)
  from auth.users u join public.member_accounts a on a.profile_id = u.id
  where u.id = p_user and (p_user = (select auth.uid()) or public.is_staff())
$$;
grant execute on function public.account_details(uuid) to authenticated;

-- ───────────── Admin › Users & roles ─────────────
-- Everyone with a board role, for super admins (a 2-step session): by role, then name. `two_factor`: on (a verified
-- factor), not_set_up (a super admin without one: required) or off. `status`: invited until the first sign-in.
create function public.admin_accounts() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  return (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.sort_role, x.name, x.user_id), '[]'::jsonb)
    from (
      select r.user_id, coalesce(nullif(r.display_name, ''), p.full_name, u.email) as name, u.email, r.role,
        case r.role when 'super_admin' then 0 when 'editor' then 1 else 2 end as sort_role,
        coalesce((select jsonb_agg(m.event_id order by m.event_id) from public.event_managers m where m.user_id = r.user_id), '[]'::jsonb) as managed_event_ids,
        case when exists (select 1 from auth.mfa_factors f where f.user_id = r.user_id and f.status = 'verified') then 'on'
             when r.role = 'super_admin' then 'not_set_up' else 'off' end as two_factor,
        case when r.invited_at is not null and u.last_sign_in_at is null then 'invited' else 'active' end as status,
        u.last_sign_in_at as last_active_at, r.invited_at
      from public.admin_roles r
      join auth.users u on u.id = r.user_id
      left join public.profiles p on p.id = r.user_id
    ) x);
end $$;
grant execute on function public.admin_accounts() to authenticated;

-- Changes the role and/or the events an event manager looks after (super admins). Leaving event manager clears the
-- events. false: that person has no board role.
create function public.admin_update_role(p_user uuid, p_role public.admin_role default null, p_events uuid[] default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  new_role public.admin_role;
begin
  if not public.is_super_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  perform 1 from public.admin_roles where user_id = p_user for update;
  if not found then return false; end if;
  update public.admin_roles set role = coalesce(p_role, role) where user_id = p_user returning role into new_role;
  if new_role <> 'event_manager' then
    delete from public.event_managers where user_id = p_user;
  elsif p_events is not null then
    delete from public.event_managers where user_id = p_user and event_id <> all (p_events);
    insert into public.event_managers (event_id, user_id)
      select e.id, p_user from public.events e where e.id = any (p_events)
      on conflict do nothing;
  end if;
  return true;
end $$;
grant execute on function public.admin_update_role(uuid, public.admin_role, uuid[]) to authenticated;

-- Removes board access (super admins). The person keeps their member account; an invited account that never signed
-- in is cleaned up with the invite flow (M21, it needs Auth's admin API).
create function public.admin_remove_role(p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  delete from public.event_managers where user_id = p_user;
  delete from public.admin_roles where user_id = p_user;
  return found;
end $$;
grant execute on function public.admin_remove_role(uuid) to authenticated;

-- ───────────── Account deletion: the files still to remove ─────────────
-- What `begin_member_deletion` queued and nobody has removed yet, for the server code that deletes them through
-- Storage's API (never SQL) and then calls `mark_deletion_file_done`.
create function public.pending_deletion_files(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('bucket', f.bucket, 'path', f.path) order by f.bucket, f.path), '[]'::jsonb)
  from public.account_deletion_files f
  where f.user_id = p_user and f.completed_at is null
$$;
grant execute on function public.pending_deletion_files(uuid) to service_role;
