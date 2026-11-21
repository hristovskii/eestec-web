-- M20f: what the inbox, notes, activity and dashboard repositories need from SQL beyond M19b.

-- ───────────── Submissions return the stored row ─────────────
-- The app shows the reference and the moment of consent straight after sending, so the function hands back the row it
-- stored (as jsonb) instead of only the reference. `p_now` is the app's clock (the same `now()` the actions use): it
-- is the moment of consent, the creation time and the year of the reference. Only the service role may call these, so
-- nobody else can choose it.
drop function public.submit_contact_message(text, text, uuid, text, text, boolean);
create function public.submit_contact_message(p_name text, p_email text, p_subject uuid, p_message text, p_locale text,
  p_consent boolean, p_now timestamptz default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.contact_subjects; route text; m public.contact_messages;
  v_at timestamptz := coalesce(p_now, now());
  y integer := extract(year from coalesce(p_now, now()) at time zone 'Europe/Skopje');
begin
  if p_consent is not true then raise exception 'Consent required' using errcode = '22023'; end if;
  select * into s from public.contact_subjects where id = p_subject;
  select route_email into route from public.contact_subject_routes where subject_id = p_subject;
  if s.id is null or route is null or trim(coalesce(p_name, '')) = '' or trim(coalesce(p_email, '')) = ''
     or trim(coalesce(p_message, '')) = '' or p_locale not in ('mk', 'en') then
    raise exception 'Invalid contact submission' using errcode = '22023';
  end if;
  insert into public.contact_messages(reference, name, email, subject_id, subject, routed_to, message, locale, consent_at, created_at, updated_at)
    values ('MSG-' || y || '-' || public.reference_suffix(public.next_reference_number('contact', y)), trim(p_name), trim(p_email), p_subject,
      coalesce(s.name->>p_locale, s.name->>'mk'), route, p_message, p_locale, v_at, v_at, v_at)
    returning * into m;
  return to_jsonb(m);
end $$;
grant execute on function public.submit_contact_message(text, text, uuid, text, text, boolean, timestamptz) to service_role;

drop function public.submit_partner_inquiry(text, text, text, text, text[], text, text, boolean);
create function public.submit_partner_inquiry(p_name text, p_email text, p_company text, p_phone text, p_interests text[],
  p_message text, p_locale text, p_consent boolean, p_now timestamptz default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  i public.partner_inquiries;
  v_at timestamptz := coalesce(p_now, now());
  y integer := extract(year from coalesce(p_now, now()) at time zone 'Europe/Skopje');
begin
  if p_consent is not true then raise exception 'Consent required' using errcode = '22023'; end if;
  if trim(coalesce(p_name, '')) = '' or trim(coalesce(p_email, '')) = '' or trim(coalesce(p_company, '')) = '' or p_locale not in ('mk', 'en') then
    raise exception 'Invalid inquiry' using errcode = '22023';
  end if;
  insert into public.partner_inquiries(reference, contact_person, email, company, phone, interests, message, locale, consent_at, created_at, updated_at)
    values ('PRT-' || y || '-' || public.reference_suffix(public.next_reference_number('partner', y)), trim(p_name), trim(p_email), trim(p_company),
      coalesce(p_phone, ''), coalesce(p_interests, '{}'), coalesce(p_message, ''), p_locale, v_at, v_at, v_at)
    returning * into i;
  return to_jsonb(i);
end $$;
grant execute on function public.submit_partner_inquiry(text, text, text, text, text[], text, text, boolean, timestamptz) to service_role;

drop function public.submit_membership(text, text, text, text, text, text, text[], text, text, boolean);
create function public.submit_membership(p_name text, p_email text, p_phone text, p_faculty text, p_study_program text, p_year text,
  p_interests text[], p_heard_from text, p_locale text, p_consent boolean, p_now timestamptz default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a public.membership_applications;
  v_at timestamptz := coalesce(p_now, now());
  y integer := extract(year from coalesce(p_now, now()) at time zone 'Europe/Skopje');
begin
  if p_consent is not true then raise exception 'Consent required' using errcode = '22023'; end if;
  if not coalesce((select (content #>> '{apply,open}')::boolean from public.page_content where page = 'join'), false) then
    raise exception 'Membership applications are closed' using errcode = '22023';
  end if;
  if trim(coalesce(p_name, '')) = '' or trim(coalesce(p_email, '')) = '' or p_locale not in ('mk', 'en') then
    raise exception 'Invalid application' using errcode = '22023';
  end if;
  if exists (select 1 from public.membership_applications m where lower(trim(m.email)) = lower(trim(p_email)) and m.status <> 'rejected') then
    return jsonb_build_object('status', 'duplicate');
  end if;
  begin
    insert into public.membership_applications(reference, name, email, phone, faculty, study_program, year_of_study, interests, heard_from, locale,
        consent_at, created_at, updated_at)
      values ('MEM-' || y || '-' || public.reference_suffix(public.next_reference_number('membership', y)), trim(p_name), trim(p_email),
        coalesce(p_phone, ''), coalesce(p_faculty, ''), coalesce(p_study_program, ''), coalesce(p_year, ''), coalesce(p_interests, '{}'),
        coalesce(p_heard_from, ''), p_locale, v_at, v_at, v_at)
      returning * into a;
  exception when unique_violation then
    -- Two identical submissions raced: the second one is a duplicate too.
    return jsonb_build_object('status', 'duplicate');
  end;
  return jsonb_build_object('status', 'created', 'application', to_jsonb(a));
end $$;
grant execute on function public.submit_membership(text, text, text, text, text, text, text[], text, text, boolean, timestamptz) to service_role;

-- ───────────── Notes: how many per item (badges in the lists) ─────────────
-- security invoker: the notes' row-level security (staff only) decides what is counted.
create function public.internal_note_counts(p_entity_type text) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_object_agg(counted.entity_id, counted.total), '{}'::jsonb)
  from (select n.entity_id, count(*) as total from public.internal_notes n where n.entity_type = p_entity_type group by n.entity_id) counted
$$;
grant execute on function public.internal_note_counts(text) to authenticated;

-- ───────────── Activity: who appears in the "person" filter ─────────────
-- Everyone who ever logged something (not only the people on the page being shown), under the name of their latest entry.
-- security invoker: only staff can read the log, so only staff get an answer.
create function public.activity_actors() returns table(user_id uuid, name text, initials text)
language sql stable security invoker set search_path = '' as $$
  select distinct on (l.actor) l.actor, coalesce(l.actor_name, ''), l.actor_initials
  from public.activity_log l where l.actor is not null
  order by l.actor, l.created_at desc
$$;
grant execute on function public.activity_actors() to authenticated;

-- ───────────── Activity: row triggers stay, but a change that changes nothing is not logged ─────────────
-- A save of identical data, a status set to the value it already had, and "mark as read" (the inbox tables pass
-- 'read_at' as an ignored column) leave no entry, and neither does an event going live. Publishing, exports and bulk
-- actions are logged by the app through record_activity, because one row event cannot tell what they mean.
create or replace function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a text; object_id uuid; label text; actor_name text; sample boolean; row_data jsonb; link text; ignored text[];
begin
  if tg_op = 'UPDATE' then
    ignored := array['updated_at'] || coalesce(string_to_array(nullif(tg_argv[2], ''), ','), array[]::text[]);
    if (to_jsonb(new) - ignored) = (to_jsonb(old) - ignored) then return new; end if;
    -- An event going live is logged as "published" by the app (record_activity), not as a second "updated".
    if tg_table_name = 'events' and to_jsonb(new)->>'status' = 'published' and to_jsonb(old)->>'status' is distinct from 'published' then
      return new;
    end if;
  end if;
  object_id := case when tg_op = 'DELETE' then old.id else new.id end;
  sample := case when tg_op = 'DELETE' then old.is_sample else new.is_sample end;
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  a := case tg_op when 'INSERT' then 'created' when 'DELETE' then 'deleted' else 'updated' end;
  label := coalesce(nullif(row_data->'title'->>'mk', ''), nullif(row_data->>'reference', ''), nullif(tg_argv[1], ''), object_id::text);
  link := case when tg_table_name = 'events' then '/admin/events/' || object_id else null end;
  select coalesce(nullif(r.display_name, ''), nullif(p.full_name, ''), u.email) into actor_name
    from auth.users u left join public.admin_roles r on r.user_id = u.id left join public.profiles p on p.id = u.id
    where u.id = (select auth.uid());
  insert into public.activity_log(actor, actor_name, actor_initials, action, area, target, href, is_sample)
    values ((select auth.uid()), actor_name, public.activity_initials(actor_name), a, tg_argv[0], label, link, sample);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger audit_contact_messages on public.contact_messages;
drop trigger audit_partner_inquiries on public.partner_inquiries;
drop trigger audit_membership_applications on public.membership_applications;
create trigger audit_contact_messages after update or delete on public.contact_messages
  for each row execute function public.audit_row_change('inbox', 'Contact message', 'read_at');
create trigger audit_partner_inquiries after update or delete on public.partner_inquiries
  for each row execute function public.audit_row_change('inbox', 'Partner inquiry', 'read_at');
create trigger audit_membership_applications after update or delete on public.membership_applications
  for each row execute function public.audit_row_change('inbox', 'Membership application', 'read_at');

-- ───────────── Dashboard: members waiting for the board ─────────────
-- Confirmed registrations awaiting approval, oldest first (the app adds the Memories queue and the other counters from
-- their own features). Event managers get nothing (D18); anyone else is refused.
create function public.dashboard_pending() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare staff boolean := public.is_staff();
begin
  if not staff and not coalesce(public.current_admin_role() = 'event_manager', false) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not staff then return jsonb_build_object('count', 0, 'oldestAt', null, 'items', '[]'::jsonb); end if;
  return (
    select jsonb_build_object(
      'count', count(*),
      'oldestAt', min(pending.submitted_at),
      'items', coalesce(jsonb_agg(jsonb_build_object('id', pending.id, 'name', pending.full_name, 'faculty', pending.faculty,
        'year', pending.year_of_study, 'submittedAt', pending.submitted_at) order by pending.submitted_at, pending.id), '[]'::jsonb))
    from (
      select p.id, p.full_name, coalesce(m.faculty, '') as faculty, m.year_of_study,
        coalesce(u.email_confirmed_at, p.created_at) as submitted_at
      from public.profiles p
      join auth.users u on u.id = p.id
      left join public.member_accounts m on m.profile_id = p.id
      where p.status = 'pending' and u.email_confirmed_at is not null
    ) pending
  );
end $$;
grant execute on function public.dashboard_pending() to authenticated;
