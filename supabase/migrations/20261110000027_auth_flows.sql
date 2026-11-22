-- M21c: registration and the e-mail links. Everything here is for the server code (service role): the app checks spam,
-- fields and the photo first, makes the Auth account with Auth's admin API, then calls these. Links are ours
-- (`auth_links`, 0001): confirm 24 h, reset 30 min; only a hash of the token is stored; a used link counts as expired.

-- ───────────── Who owns this e-mail address ─────────────
-- What the server needs to decide between "new", "still waiting for its link", "taken" and "may reset a password".
-- null: no such account.
create function public.auth_user_state(p_email text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'user_id', u.id,
    'email', u.email,
    'confirmed', u.email_confirmed_at is not null,
    'registered', exists (select 1 from public.member_accounts a where a.profile_id = u.id),
    'profile_status', (select p.status from public.profiles p where p.id = u.id),
    'has_role', exists (select 1 from public.admin_roles r where r.user_id = u.id),
    'deleting', public.account_deletion_pending(u.id))
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1
$$;
revoke execute on function public.auth_user_state(text) from public, anon, authenticated;
grant execute on function public.auth_user_state(text) to service_role;

-- ───────────── Registration ─────────────
-- Writes what a person entered: the profile (status pending, shown as inactive until the board approves), the private
-- row (faculty, year, phone, consent and the language of the page) and the sign-up photo. The Auth account exists
-- already. Registering again while the e-mail link was never used ("wrong e-mail? change it") updates the same rows;
-- anyone else is `23505`. The profile address (`p_username`, a slug of the name) gets a number when it is taken.
create function public.register_member(p_user uuid, p_name text, p_username text, p_faculty text, p_year text,
  p_phone text, p_visibility text, p_locale text, p_now timestamptz, p_photo jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  waiting boolean;
  known boolean;
  chosen text;
  attempt integer := 1;
  suffix text;
  old_id uuid;
  old_path text;
  new_id uuid;
  chosen_visibility public.profile_visibility;
  broke text;
begin
  select u.email_confirmed_at is null into waiting from auth.users u where u.id = p_user;
  if waiting is null then raise exception 'No such account' using errcode = 'P0002'; end if;
  if p_locale not in ('mk', 'en') or p_visibility not in ('public', 'members') or p_year not in ('1', '2', '3', '4', 'master', 'phd') then
    raise exception 'Invalid registration' using errcode = '22023';
  end if;
  chosen_visibility := case p_visibility when 'public' then 'public'::public.profile_visibility else 'members_only'::public.profile_visibility end;
  select exists (select 1 from public.profiles where id = p_user) into known;
  if known and (not waiting or not exists (select 1 from public.member_accounts where profile_id = p_user)) then
    raise exception 'Already registered' using errcode = '23505';
  end if;
  if p_photo is not null and (
       (storage.foldername(p_photo ->> 'path'))[1] is distinct from p_user::text
       or not exists (select 1 from storage.objects where bucket_id = 'avatars' and name = p_photo ->> 'path')) then
    raise exception 'The photo is not in the folder of this account' using errcode = '22023';
  end if;

  if known then
    update public.profiles set full_name = trim(p_name), visibility = chosen_visibility where id = p_user
      returning username into chosen;
  else
    loop
      suffix := case when attempt = 1 then '' else '-' || attempt end;
      chosen := regexp_replace(left(p_username, 30 - length(suffix)), '-+$', '') || suffix;
      begin
        insert into public.profiles (id, username, full_name, visibility, status)
          values (p_user, chosen, trim(p_name), chosen_visibility, 'pending');
        exit;
      exception when unique_violation or check_violation then
        -- Only the address is retried (taken, or a reserved word); any other broken rule is the caller's problem.
        get stacked diagnostics broke = constraint_name;
        if broke not in ('profiles_username_key', 'profiles_username_not_reserved') then raise; end if;
        attempt := attempt + 1;
        if attempt > 50 then raise exception 'No free profile address' using errcode = '23505'; end if;
      end;
    end loop;
  end if;

  insert into public.member_accounts (profile_id, faculty, year_of_study, phone, data_consent_at, registration_locale)
    values (p_user, p_faculty, p_year, coalesce(p_phone, ''), p_now, p_locale)
    on conflict (profile_id) do update set faculty = excluded.faculty, year_of_study = excluded.year_of_study,
      phone = excluded.phone, data_consent_at = excluded.data_consent_at, registration_locale = excluded.registration_locale;

  -- The photo of an earlier try is replaced (or dropped when this try has none); its file is queued for removal.
  select m.id, m.path into old_id, old_path
    from public.profiles p join public.media m on m.id = p.photo_media_id
    where p.id = p_user and m.bucket = 'avatars' and m.uploaded_by = p_user;
  if old_id is not null and (p_photo is null or old_path is distinct from p_photo ->> 'path') then
    update public.profiles set photo_media_id = null where id = p_user;
    delete from public.media where id = old_id;
    insert into public.storage_cleanup_queue (bucket, path, reason) values ('avatars', old_path, 'registration repeated');
  end if;
  if p_photo is not null and old_path is distinct from p_photo ->> 'path' then
    insert into public.media (bucket, path, kind, file_name, mime_type, size_bytes, uploaded_by)
      values ('avatars', p_photo ->> 'path', 'image', coalesce(nullif(p_photo ->> 'name', ''), 'photo.jpg'),
        p_photo ->> 'mime', (p_photo ->> 'size')::integer, p_user)
      returning id into new_id;
    update public.profiles set photo_media_id = new_id where id = p_user;
  end if;
  return jsonb_build_object('username', chosen, 'previous_photo', old_path);
end $$;
revoke execute on function public.register_member(uuid, text, text, text, text, text, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.register_member(uuid, text, text, text, text, text, text, text, timestamptz, jsonb) to service_role;

-- ───────────── E-mail links ─────────────
-- A new link replaces the older unused ones of the same kind for that person.
create function public.auth_link_issue(p_user uuid, p_kind public.auth_link_kind, p_hash text, p_expires timestamptz,
  p_new_email text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.auth_links where user_id = p_user and kind = p_kind and used_at is null;
  insert into public.auth_links (user_id, kind, token_hash, new_email, expires_at)
    values (p_user, p_kind, p_hash, p_new_email, p_expires);
end $$;
revoke execute on function public.auth_link_issue(uuid, public.auth_link_kind, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.auth_link_issue(uuid, public.auth_link_kind, text, timestamptz, text) to service_role;

-- Looks at a link without using it. `state`: valid, expired (used, or too old) or invalid (unknown, or another kind).
-- `email` is the address the link is about: the new one for an e-mail change.
create function public.auth_link_peek(p_hash text, p_kind public.auth_link_kind, p_now timestamptz) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case
    when l.id is null or l.kind <> p_kind then jsonb_build_object('state', 'invalid')
    when l.used_at is not null or l.expires_at <= p_now then jsonb_build_object('state', 'expired')
    else jsonb_build_object('state', 'valid', 'user_id', l.user_id,
      'email', coalesce(l.new_email, u.email),
      'name', coalesce(nullif(p.full_name, ''), nullif(r.display_name, ''), u.email),
      'locale', coalesce(a.registration_locale, 'mk'))
  end
  from (select 1) one
  left join public.auth_links l on l.token_hash = p_hash
  left join auth.users u on u.id = l.user_id
  left join public.profiles p on p.id = l.user_id
  left join public.member_accounts a on a.profile_id = l.user_id
  left join public.admin_roles r on r.user_id = l.user_id
$$;
revoke execute on function public.auth_link_peek(text, public.auth_link_kind, timestamptz) from public, anon, authenticated;
grant execute on function public.auth_link_peek(text, public.auth_link_kind, timestamptz) to service_role;

-- Uses a link once: the person it belongs to, or null when it is unknown, used, too old or of another kind.
create function public.auth_link_use(p_hash text, p_kind public.auth_link_kind, p_now timestamptz) returns uuid
language sql security definer set search_path = '' as $$
  update public.auth_links set used_at = p_now
  where token_hash = p_hash and kind = p_kind and used_at is null and expires_at > p_now
  returning user_id
$$;
revoke execute on function public.auth_link_use(text, public.auth_link_kind, timestamptz) from public, anon, authenticated;
grant execute on function public.auth_link_use(text, public.auth_link_kind, timestamptz) to service_role;

-- After a password was chosen with a reset link: every session of the person ends (they sign in again with the new
-- one), the mistakes counted against the address are forgotten and the change is dated.
create function public.password_reset_done(p_user uuid, p_now timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  mail text;
begin
  select lower(trim(email)) into mail from auth.users where id = p_user;
  update public.member_accounts set password_changed_at = p_now where profile_id = p_user;
  delete from auth.sessions where user_id = p_user;
  delete from public.login_lockouts where email_key = mail;
end $$;
revoke execute on function public.password_reset_done(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.password_reset_done(uuid, timestamptz) to service_role;
