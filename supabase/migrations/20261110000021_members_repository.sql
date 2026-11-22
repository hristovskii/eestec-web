-- M20g: what the members repository needs from SQL beyond M19a/M19c.

-- ───────────── One profile as the app reads it ─────────────
-- Internal builder (no grant): the callers below decide which profiles a viewer may get. `faculty` is private
-- (member_accounts), so only the person and staff receive it. A photo is described, never linked: the app builds the
-- address from the bucket, because private avatars have their own delivery route that checks `can_read_avatar`.
create function public.profile_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'user_id', p.id,
    'username', p.username,
    'name', p.full_name,
    'has_photo', p.photo_media_id is not null,
    'photo_bucket', m.bucket,
    'photo_path', m.path,
    'photo_public_path', m.public_path,
    'hide_photo', p.hide_photo,
    'bio', p.bio,
    'hide_bio', p.hide_bio,
    'linkedin_url', p.linkedin_url,
    'github_url', p.github_url,
    'visibility', p.visibility,
    'status', p.status,
    -- Until the board approves someone there is no "member since": the day the account was made stands in.
    'member_since', coalesce(p.member_since, (p.created_at at time zone 'Europe/Skopje')::date),
    'active_to', p.active_to,
    'alumni_now', p.alumni_now,
    'alumni_highlight', p.alumni_highlight,
    'faculty', case when p.id = (select auth.uid()) or public.is_staff() then coalesce(a.faculty, '') else '' end,
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object('team_id', mt.team_id, 'role', mt.role) order by t.sort_order, t.id)
      from public.member_teams mt join public.teams t on t.id = mt.team_id where mt.profile_id = p.id), '[]'::jsonb),
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object('badge_id', mb.badge_id, 'note', mb.note, 'awarded_at', mb.awarded_at)
        order by mb.awarded_at desc, mb.badge_id)
      from public.member_badges mb where mb.profile_id = p.id), '[]'::jsonb)
  )
  from public.profiles p
  left join public.media m on m.id = p.photo_media_id
  left join public.member_accounts a on a.profile_id = p.id
  where p.id = p_id
$$;

-- Every profile this viewer may read, for the members pages and Admin › Members: staff get all four statuses, a person
-- their own, everyone else the active and alumni profiles that are public (members also the members-only ones). The
-- same rule as the row-level security on `profiles`; pending and rejected people are registrations, not profiles.
create function public.members_directory() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.profile_json(p.id) order by p.full_name, p.id), '[]'::jsonb)
  from public.profiles p
  where p.status in ('active', 'alumni', 'inactive', 'hidden')
    and (public.is_staff() or p.id = (select auth.uid())
      or (p.status in ('active', 'alumni') and (p.visibility = 'public' or public.is_member_audience())))
$$;
grant execute on function public.members_directory() to anon, authenticated;

-- ───────────── My profile ─────────────
-- Everything /profile shows about the signed-in person in one read: the profile (also while pending), the choices, the CV
-- on file and how often partners looked at it this year. null: no profile row.
create function public.my_profile(p_year integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null or not exists (select 1 from public.profiles where id = uid) then return null; end if;
  return (
    select jsonb_build_object(
      'profile', public.profile_json(uid),
      'consents', jsonb_build_object(
        'newsletter', coalesce(a.newsletter_opt_in, false), 'gallery_name', coalesce(a.gallery_name_opt_in, false),
        'cv_opt_in', coalesce(a.cv_opt_in, false), 'cv_consent_at', a.cv_consent_at),
      'cv', case when a.cv_path is not null then jsonb_build_object(
        'file_name', a.cv_file_name, 'size', a.cv_size, 'uploaded_at', a.cv_uploaded_at) end,
      'cv_views', (select count(*) from public.cv_export_log l where l.profile_id = uid
        and extract(year from l.exported_at at time zone 'Europe/Skopje') = p_year))
    from public.profiles p left join public.member_accounts a on a.profile_id = p.id where p.id = uid
  );
end $$;
grant execute on function public.my_profile(integer) to authenticated;

-- The profile card's Save: the person's own name, address, bio, links and faculty, all or nothing. An address another
-- profile has is a result ('username_taken'), not an error. Not allowed once deletion has started.
create function public.update_my_profile(p_edit jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null or public.account_deletion_pending(uid) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = uid and status <> 'rejected') then
    return jsonb_build_object('status', 'not_found');
  end if;
  begin
    update public.profiles set
      full_name = p_edit ->> 'name', username = p_edit ->> 'username', bio = coalesce(p_edit ->> 'bio', ''),
      linkedin_url = coalesce(p_edit ->> 'linkedin_url', ''), github_url = coalesce(p_edit ->> 'github_url', '')
    where id = uid;
  exception when unique_violation then
    return jsonb_build_object('status', 'username_taken');
  end;
  update public.member_accounts set faculty = coalesce(p_edit ->> 'faculty', '') where profile_id = uid;
  return jsonb_build_object('status', 'saved');
end $$;
grant execute on function public.update_my_profile(jsonb) to authenticated;

-- Is this address taken by another profile (any status, any letter case)? Profiles are not readable one by one, so
-- the answer comes from here.
create function public.username_taken(p_username text, p_except uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.profiles where lower(username) = lower(p_username) and (p_except is null or id <> p_except))
$$;
grant execute on function public.username_taken(text, uuid) to authenticated;

-- ───────────── Admin › Members: a new badge gets the day of the app clock ─────────────
-- Same function as in 0003 plus `p_now`, so the award date is the app's "today" in Skopje, not the database's date.
drop function public.admin_save_member(uuid, jsonb);
create function public.admin_save_member(p_user uuid, p_edit jsonb, p_now timestamptz default null) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  new_status public.profile_status := (p_edit ->> 'status')::public.profile_status;
  awarded date := (coalesce(p_now, now()) at time zone 'Europe/Skopje')::date;
begin
  perform public.require_staff();
  if new_status in ('pending', 'rejected') then
    raise exception 'The board changes pending and rejected people in Approvals' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_user and status not in ('pending', 'rejected')) then
    return false;
  end if;

  update public.profiles set
    status = new_status,
    member_since = (p_edit ->> 'member_since')::date,
    active_to = case when new_status = 'alumni' then (p_edit ->> 'active_to')::date end,
    alumni_now = case when new_status = 'alumni' then nullif(p_edit -> 'alumni_now', 'null'::jsonb) end,
    alumni_highlight = case when new_status = 'alumni' then nullif(p_edit -> 'alumni_highlight', 'null'::jsonb) end,
    hide_photo = coalesce((p_edit ->> 'hide_photo')::boolean, false),
    hide_bio = coalesce((p_edit ->> 'hide_bio')::boolean, false)
  where id = p_user;

  delete from public.member_teams where profile_id = p_user
    and team_id not in (select (e ->> 'team_id')::uuid from jsonb_array_elements(coalesce(p_edit -> 'teams', '[]')) e);
  insert into public.member_teams (profile_id, team_id, role)
    select p_user, t.id, (e ->> 'role')::public.team_role
      from jsonb_array_elements(coalesce(p_edit -> 'teams', '[]')) e
      join public.teams t on t.id = (e ->> 'team_id')::uuid
    on conflict (profile_id, team_id) do update set role = excluded.role;

  delete from public.member_badges where profile_id = p_user
    and badge_id not in (select (e ->> 'badge_id')::uuid from jsonb_array_elements(coalesce(p_edit -> 'badges', '[]')) e);
  insert into public.member_badges (profile_id, badge_id, note, awarded_at)
    select p_user, b.id, coalesce(e ->> 'note', ''), awarded
      from jsonb_array_elements(coalesce(p_edit -> 'badges', '[]')) e
      join public.badges b on b.id = (e ->> 'badge_id')::uuid
    on conflict (profile_id, badge_id) do update set note = excluded.note;
  return true;
end $$;
grant execute on function public.admin_save_member(uuid, jsonb, timestamptz) to authenticated;

-- ───────────── Authors: say which page this viewer gets ─────────────
-- Same card as in 0003 plus `page`: 'full' (the viewer may open the profile), 'restricted' (it exists, but only the name,
-- teams and a lock are shown to this viewer) or 'none' (inactive or hidden: no page at all).
drop function public.author_cards(uuid[]);
create function public.author_cards(p_ids uuid[])
returns table (user_id uuid, full_name text, username text, photo_bucket text, photo_path text,
               photo_public_path text, team_names jsonb, since integer, bio text, page text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name,
         case when p.status in ('active', 'alumni') then p.username end,
         case when v.visible and not p.hide_photo then m.bucket end,
         case when v.visible and not p.hide_photo then m.path end,
         case when v.visible and not p.hide_photo then m.public_path end,
         coalesce((select jsonb_agg(t.name order by t.sort_order)
                   from public.member_teams mt join public.teams t on t.id = mt.team_id
                   where mt.profile_id = p.id), '[]'::jsonb),
         extract(year from coalesce(p.member_since, (p.created_at at time zone 'Europe/Skopje')::date))::integer,
         case when v.visible and not p.hide_bio then p.bio else '' end,
         case when v.visible then 'full' when p.status in ('active', 'alumni') then 'restricted' else 'none' end
  from public.profiles p
  left join public.media m on m.id = p.photo_media_id
  cross join lateral (
    select p.status in ('active', 'alumni') and (p.visibility = 'public' or public.is_member_audience()) as visible
  ) v
  where p.id = any (p_ids) and p.status in ('active', 'alumni', 'inactive', 'hidden')
$$;
grant execute on function public.author_cards(uuid[]) to anon, authenticated;
