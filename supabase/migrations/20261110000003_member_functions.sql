-- eestec.mk · M19a · functions: what visitors may learn without a select, admin saves, approvals, lockout.
-- All are security definer with an empty search_path. Each grants execute to the roles that may call it.

-- ───────────── Reads for visitors and members ─────────────

-- How many active members-only profiles a visitor cannot see (the members page says "N more for members").
create function public.members_hidden_count() returns integer
language sql stable security definer set search_path = '' as $$
  select case when public.is_member_audience() then 0 else (
    select count(*)::integer from public.profiles where status = 'active' and visibility = 'members_only'
  ) end
$$;

-- The "restricted" page of a members-only profile: name, teams and member since, nothing more.
create function public.profile_restricted(p_username text)
returns table (user_id uuid, username text, full_name text, member_since date, teams jsonb)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.full_name, p.member_since,
         coalesce((
           select jsonb_agg(jsonb_build_object('team_id', mt.team_id, 'role', mt.role) order by t.sort_order)
           from public.member_teams mt join public.teams t on t.id = mt.team_id
           where mt.profile_id = p.id
         ), '[]'::jsonb)
  from public.profiles p
  where lower(p.username) = lower(p_username) and p.status in ('active', 'alumni')
$$;

-- A board and its seats. The board is public: name and photo show for everyone; the profile page
-- (username) only when the viewer may open it. A label that does not exist gives the current board.
create function public.board_view(p_label text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  picked public.board_mandates;
  seats jsonb;
begin
  select * into picked from public.board_mandates
   where label = p_label
   union all
  select * from public.board_mandates where is_current
   limit 1;
  if picked.id is null then
    select * into picked from public.board_mandates order by starts_on desc limit 1;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'seat_id', b.id,
      'board_role_id', b.board_role_id,
      'title', b.role_title_snapshot,
      'name', p.full_name,
      'username', case when p.status in ('active', 'alumni') and (p.visibility = 'public' or public.is_member_audience())
                       then p.username end,
      'photo_bucket', case when p.hide_photo then null else m.bucket end,
      'photo_path', case when p.hide_photo then null else m.path end,
      'photo_public_path', case when p.hide_photo then null else m.public_path end
    ) order by b.sort_order), '[]'::jsonb)
    into seats
    from public.board_members b
    join public.profiles p on p.id = b.profile_id
    left join public.media m on m.id = p.photo_media_id
   where b.mandate_id = picked.id;

  return jsonb_build_object(
    'mandates', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'label', label, 'is_current', is_current)
                                           order by starts_on desc) from public.board_mandates), '[]'::jsonb),
    'selected', case when picked.id is null then null else jsonb_build_object(
      'id', picked.id, 'label', picked.label, 'is_current', picked.is_current, 'seats', seats) end
  );
end
$$;

-- People as authors of something (a Memory): the name always; the page, photo and bio only as far as
-- the viewer may see them. Pending and rejected people are left out.
create function public.author_cards(p_ids uuid[])
returns table (user_id uuid, full_name text, username text, photo_bucket text, photo_path text,
               photo_public_path text, team_names jsonb, since integer, bio text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name,
         case when p.status in ('active', 'alumni') then p.username end,
         case when v.visible and not p.hide_photo then m.bucket end,
         case when v.visible and not p.hide_photo then m.path end,
         case when v.visible and not p.hide_photo then m.public_path end,
         coalesce((select jsonb_agg(t.name order by t.sort_order)
                   from public.member_teams mt join public.teams t on t.id = mt.team_id
                   where mt.profile_id = p.id), '[]'::jsonb),
         extract(year from p.member_since)::integer,
         case when v.visible and not p.hide_bio then p.bio else '' end
  from public.profiles p
  left join public.media m on m.id = p.photo_media_id
  cross join lateral (
    select p.status in ('active', 'alumni') and (p.visibility = 'public' or public.is_member_audience()) as visible
  ) v
  where p.id = any (p_ids) and p.status in ('active', 'alumni', 'inactive', 'hidden')
$$;

grant execute on function
  public.members_hidden_count(), public.profile_restricted(text), public.board_view(text), public.author_cards(uuid[])
  to anon, authenticated;

-- ───────────── Admin › Members, Teams, Board (staff only) ─────────────

create function public.require_staff() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
end
$$;

-- Replaces what the board edits on a profile (ProfileEdit): status, dates, alumni lines, moderation,
-- teams and badges. Unknown teams and badges are ignored; a kept badge keeps its award date.
-- Returns false when there is no such person. Events are not edited here (D23: derived).
create function public.admin_save_member(p_user uuid, p_edit jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  new_status public.profile_status := (p_edit ->> 'status')::public.profile_status;
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
    alumni_now = nullif(p_edit -> 'alumni_now', 'null'::jsonb),
    alumni_highlight = nullif(p_edit -> 'alumni_highlight', 'null'::jsonb),
    hide_photo = coalesce((p_edit ->> 'hide_photo')::boolean, false),
    hide_bio = coalesce((p_edit ->> 'hide_bio')::boolean, false)
  where id = p_user;

  -- teams
  delete from public.member_teams where profile_id = p_user
    and team_id not in (select (e ->> 'team_id')::uuid from jsonb_array_elements(coalesce(p_edit -> 'teams', '[]')) e);
  insert into public.member_teams (profile_id, team_id, role)
    select p_user, t.id, (e ->> 'role')::public.team_role
      from jsonb_array_elements(coalesce(p_edit -> 'teams', '[]')) e
      join public.teams t on t.id = (e ->> 'team_id')::uuid
    on conflict (profile_id, team_id) do update set role = excluded.role;

  -- badges
  delete from public.member_badges where profile_id = p_user
    and badge_id not in (select (e ->> 'badge_id')::uuid from jsonb_array_elements(coalesce(p_edit -> 'badges', '[]')) e);
  insert into public.member_badges (profile_id, badge_id, note)
    select p_user, b.id, coalesce(e ->> 'note', '')
      from jsonb_array_elements(coalesce(p_edit -> 'badges', '[]')) e
      join public.badges b on b.id = (e ->> 'badge_id')::uuid
    on conflict (profile_id, badge_id) do update set note = excluded.note;
  return true;
end
$$;

create function public.set_current_mandate(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_staff();
  if not exists (select 1 from public.board_mandates where id = p_id) then return false; end if;
  perform set_config('eestec.moving_current', 'on', true);
  update public.board_mandates set is_current = false where is_current and id <> p_id;
  update public.board_mandates set is_current = true where id = p_id;
  perform set_config('eestec.moving_current', 'off', true);
  return true;
end
$$;

create function public.reorder_teams(p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_staff();
  update public.teams t set sort_order = o.position
    from unnest(p_ids) with ordinality as o (id, position) where t.id = o.id;
end
$$;

create function public.reorder_seats(p_mandate uuid, p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_staff();
  update public.board_members b set sort_order = o.position
    from unnest(p_ids) with ordinality as o (id, position) where b.id = o.id and b.mandate_id = p_mandate;
end
$$;

-- Approvals › Member registrations: up to 50 people at once, only those still pending whose e-mail is
-- confirmed. Returns { decided: [...], already_decided: [...] }; e-mails are sent by the caller afterwards.
create function public.decide_member_registrations(p_ids uuid[], p_decision text, p_reason text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  done uuid[];
begin
  perform public.require_staff();
  if p_decision not in ('approve', 'reject') then
    raise exception 'Decision must be approve or reject' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_ids), 0) not between 1 and 50 then
    raise exception 'Decide between 1 and 50 people at a time' using errcode = '22023';
  end if;

  with ready as (
    select p.id from public.profiles p
      join auth.users u on u.id = p.id and u.email_confirmed_at is not null
     where p.id = any (p_ids) and p.status = 'pending'
     for update of p
  ), changed as (
    update public.profiles p set
      status = case p_decision when 'approve' then 'active'::public.profile_status else 'rejected'::public.profile_status end,
      member_since = case when p_decision = 'approve' then (now() at time zone 'Europe/Skopje')::date else p.member_since end
     from ready where p.id = ready.id
    returning p.id
  )
  select coalesce(array_agg(id), '{}') into done from changed;

  update public.member_accounts set
    decided_at = now(),
    approved_at = case when p_decision = 'approve' then now() end,
    approved_by = case when p_decision = 'approve' then (select auth.uid()) end,
    rejection_reason = case when p_decision = 'reject' then nullif(trim(p_reason), '') end
   where profile_id = any (done);

  return jsonb_build_object(
    'decided', to_jsonb(done),
    'already_decided', to_jsonb(array(select x from unnest(p_ids) x where not x = any (done)))
  );
end
$$;

grant execute on function
  public.admin_save_member(uuid, jsonb), public.set_current_mandate(uuid), public.reorder_teams(uuid[]),
  public.reorder_seats(uuid, uuid[]), public.decide_member_registrations(uuid[], text, text)
  to authenticated;
-- require_staff() is called from the functions above; it needs no grant of its own.

-- ───────────── Sign-in lockout (server code only) ─────────────
-- DECIDED: 5 failures within 15 minutes pause that address for 15 minutes. Keyed by e-mail only,
-- so unknown addresses behave the same (no way to tell who has an account). Called with the service role.

create function public.login_gate(p_email text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  rec public.login_lockouts;
  recent integer;
begin
  select * into rec from public.login_lockouts where email_key = lower(trim(p_email));
  if rec.locked_until is not null and rec.locked_until > now() then
    return jsonb_build_object('locked', true, 'until', rec.locked_until, 'attempts_left', 0);
  end if;
  select count(*) into recent from unnest(coalesce(rec.failures, '{}')) f where f > now() - interval '15 minutes';
  return jsonb_build_object('locked', false, 'until', null, 'attempts_left', greatest(0, 5 - recent));
end
$$;

-- After the password was checked: a success forgets the failures; a failure counts, the 5th locks.
create function public.login_record(p_email text, p_ok boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  key text := lower(trim(p_email));
  rec public.login_lockouts;
  kept timestamptz[];
begin
  if p_ok then
    delete from public.login_lockouts where email_key = key;
    return jsonb_build_object('locked', false, 'until', null, 'attempts_left', 5);
  end if;

  insert into public.login_lockouts (email_key) values (key) on conflict (email_key) do nothing;
  select * into rec from public.login_lockouts where email_key = key for update;

  if rec.locked_until is not null and rec.locked_until > now() then
    return jsonb_build_object('locked', true, 'until', rec.locked_until, 'attempts_left', 0);
  end if;

  kept := array(select f from unnest(rec.failures) f where f > now() - interval '15 minutes') || now();
  if cardinality(kept) >= 5 then
    update public.login_lockouts set failures = '{}', locked_until = now() + interval '15 minutes', updated_at = now()
     where email_key = key returning locked_until into rec.locked_until;
    return jsonb_build_object('locked', true, 'until', rec.locked_until, 'attempts_left', 0);
  end if;
  update public.login_lockouts set failures = kept, locked_until = null, updated_at = now() where email_key = key;
  return jsonb_build_object('locked', false, 'until', null, 'attempts_left', 5 - cardinality(kept));
end
$$;

revoke execute on function public.login_gate(text), public.login_record(text, boolean) from public, anon, authenticated;
grant execute on function public.login_gate(text), public.login_record(text, boolean) to service_role;
