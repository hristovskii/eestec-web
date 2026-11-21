-- eestec.mk · M19 review fixes for the schema merged in M19b (migrations 0004-0007 are on main, so
-- the corrections live here). Each block names the finding it closes.

-- ───────────── Activity log: event managers log their own area (B1), initials are stored (A16) ─────────────
create function public.activity_initials(p_name text) returns text
language sql immutable set search_path = '' as $$
  select nullif(upper(coalesce(string_agg(left(word, 1), ''), '')), '')
  from (select word from regexp_split_to_table(coalesce(p_name, ''), '\s+') word where word <> '' limit 2) words
$$;

-- Event managers save, publish and upload (D18), so they must be able to log those areas; they never log
-- inbox, members, settings or other areas.
create or replace function public.record_activity(p_action text, p_area text, p_target text, p_href text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare actor_name text;
begin
  if not public.is_staff()
     and not (coalesce(public.current_admin_role() = 'event_manager', false) and p_area in ('events', 'applications', 'media')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select coalesce(nullif(r.display_name, ''), nullif(p.full_name, ''), u.email) into actor_name
    from auth.users u left join public.admin_roles r on r.user_id = u.id left join public.profiles p on p.id = u.id
    where u.id = (select auth.uid());
  insert into public.activity_log(actor, actor_name, actor_initials, action, area, target, href)
    values ((select auth.uid()), actor_name, public.activity_initials(actor_name), p_action, p_area, p_target, p_href);
end $$;

create or replace function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a text; object_id uuid; label text; actor_name text; sample boolean; row_data jsonb; link text;
begin
  object_id := case when tg_op = 'DELETE' then old.id else new.id end;
  sample := case when tg_op = 'DELETE' then old.is_sample else new.is_sample end;
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  a := case tg_op when 'INSERT' then 'created' when 'DELETE' then 'deleted' else 'updated' end;
  label := coalesce(nullif(row_data->'title'->>'mk',''),nullif(row_data->>'reference',''),nullif(tg_argv[1],''),object_id::text);
  link := case when tg_table_name = 'events' then '/admin/events/' || object_id else null end;
  select coalesce(nullif(r.display_name, ''), nullif(p.full_name, ''), u.email) into actor_name
    from auth.users u left join public.admin_roles r on r.user_id = u.id left join public.profiles p on p.id = u.id
    where u.id = (select auth.uid());
  insert into public.activity_log(actor, actor_name, actor_initials, action, area, target, href, is_sample)
    values ((select auth.uid()), actor_name, public.activity_initials(actor_name), a, tg_argv[0], label, link, sample);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

-- ───────────── Membership: a duplicate is a result, not an error (B2) ─────────────
drop function public.submit_membership(text, text, text, text, text, text, text[], text, text, boolean);
create function public.submit_membership(p_name text, p_email text, p_phone text, p_faculty text, p_study_program text, p_year text,
  p_interests text[], p_heard_from text, p_locale text, p_consent boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ref text; y integer := extract(year from now() at time zone 'Europe/Skopje');
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
    ref := 'MEM-' || y || '-' || public.reference_suffix(public.next_reference_number('membership', y));
    insert into public.membership_applications(reference, name, email, phone, faculty, study_program, year_of_study, interests, heard_from, locale)
      values (ref, trim(p_name), trim(p_email), coalesce(p_phone, ''), coalesce(p_faculty, ''), coalesce(p_study_program, ''), coalesce(p_year, ''),
        coalesce(p_interests, '{}'), coalesce(p_heard_from, ''), p_locale);
  exception when unique_violation then
    -- Two identical submissions raced: the second one is a duplicate too.
    return jsonb_build_object('status', 'duplicate');
  end;
  return jsonb_build_object('status', 'created', 'reference', ref);
end $$;
grant execute on function public.submit_membership(text, text, text, text, text, text, text[], text, text, boolean) to service_role;

-- ───────────── Applications: files arrive with the application (B3), reference prefix as in the app (A8) ─────────────
-- "ai-at-the-edge" -> AIE, "leading-teams" -> LEA, a slug of small words only -> APP; mirrors
-- src/features/applications/domain/reference.ts. The running number stays per prefix and year so references stay unique.
create function public.application_reference_prefix(p_slug text) returns text
language sql immutable set search_path = '' as $$
  select rpad(upper(coalesce(nullif(left(regexp_replace(coalesce(
    (select string_agg(w.word, '' order by w.position) from regexp_split_to_table(lower(coalesce(p_slug, '')), '-') with ordinality as w(word, position)
      where w.word <> '' and w.word <> all (array['a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'the', 'to', 'with'])), ''),
    '[^a-z0-9]', '', 'g'), 3), ''), 'app')), 3, 'X')
$$;

drop function public.submit_application(uuid, text, text, jsonb, text, boolean, uuid);
create function public.submit_application(p_event uuid, p_name text, p_email text, p_answers jsonb, p_locale text, p_consent boolean,
  p_profile uuid default null, p_files jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  e public.events; taken integer; waiting integer; waitlist_slot integer; app_status public.application_status;
  ref text; created public.applications; member_id uuid; event_year integer; prefix text; autoclose boolean;
begin
  select * into e from public.events where id = p_event for update;
  if not found or e.status not in ('published','hidden') or (e.publish_at is not null and e.publish_at > now())
    or e.starts_at <= now() or not e.applications_enabled or e.apply_via <> 'form'
    or (e.opens_at is not null and e.opens_at > now()) then
    return jsonb_build_object('status','closed');
  end if;
  select coalesce((value ->> 'autoCloseApplications')::boolean, true) into autoclose from public.site_settings where key = 'events';
  if coalesce(autoclose, true) and e.deadline is not null and e.deadline <= now() then return jsonb_build_object('status','closed'); end if;
  if p_consent is not true then raise exception 'Consent required' using errcode = '22023'; end if;
  if p_name is null or trim(p_name) = '' or p_email is null or trim(p_email) = '' or p_locale not in ('mk','en') then
    raise exception 'Invalid application' using errcode = '22023';
  end if;
  if p_files is null or jsonb_typeof(p_files) <> 'array' or exists (
    select 1 from jsonb_array_elements(p_files) f
    where jsonb_typeof(f) <> 'object' or nullif(trim(f->>'field_key'), '') is null or nullif(trim(f->>'path'), '') is null
      or nullif(trim(f->>'file_name'), '') is null or nullif(trim(f->>'mime_type'), '') is null or (f->>'size_bytes') !~ '^[0-9]+$'
  ) then
    raise exception 'Invalid application files' using errcode = '22023';
  end if;
  if exists (select 1 from public.applications a where a.event_id = p_event and lower(trim(a.email)) = lower(trim(p_email))) then
    return jsonb_build_object('status','duplicate');
  end if;
  select count(*) filter (where status = 'accepted'), count(*) filter (where status = 'waitlist')
    into taken, waiting from public.applications where event_id = p_event;
  if (e.max_participants is not null and taken >= e.max_participants) or (e.admission = 'first_come' and e.waitlist and waiting > 0) then
    if not e.waitlist then return jsonb_build_object('status','full'); end if;
    app_status := 'waitlist'; waitlist_slot := waiting + 1;
  elsif e.admission = 'first_come' then app_status := 'accepted';
  else app_status := 'pending'; end if;
  select p.id into member_id from public.profiles p join auth.users u on u.id = p.id
    where p.id = p_profile and u.email_confirmed_at is not null and lower(trim(u.email)) = lower(trim(p_email));
  event_year := extract(year from e.starts_at at time zone 'Europe/Skopje');
  prefix := public.application_reference_prefix(e.slug);
  ref := prefix || '-' || event_year || '-' || public.reference_suffix(public.next_reference_number('application:' || prefix, event_year));
  insert into public.applications(event_id, reference, name, email, answers, status, waitlist_position, locale, profile_id)
    values (p_event, ref, trim(p_name), trim(p_email), coalesce(p_answers,'{}'), app_status, waitlist_slot, p_locale, member_id)
    returning * into created;
  insert into public.application_files(application_id, field_key, path, file_name, mime_type, size_bytes)
    select created.id, f->>'field_key', f->>'path', f->>'file_name', f->>'mime_type', (f->>'size_bytes')::integer
    from jsonb_array_elements(p_files) f;
  return jsonb_build_object('status','created','application',to_jsonb(created));
end $$;
grant execute on function public.submit_application(uuid, text, text, jsonb, text, boolean, uuid, jsonb) to service_role;

-- Hidden events stay reachable by address, so their availability must stay readable too (A4).
create or replace function public.application_availability(p_event_ids uuid[]) returns table(event_id uuid, taken bigint, waiting bigint)
language sql stable security definer set search_path = '' as $$
  select e.id, count(a.id) filter (where a.status = 'accepted'), count(a.id) filter (where a.status = 'waitlist')
  from public.events e left join public.applications a on a.event_id = e.id
  where e.id = any(p_event_ids) and (e.status in ('published', 'hidden') and (e.publish_at is null or e.publish_at <= now())
    or public.is_staff() or public.is_event_manager_of(e.id)) group by e.id
$$;

-- The first time an application was opened is kept (A5), as the app does.
create or replace function public.mark_application_read(p_id uuid, p_read_at timestamptz) returns boolean
language plpgsql security definer set search_path = '' as $$
declare e_id uuid;
begin
  select event_id into e_id from public.applications where id = p_id;
  if e_id is null then return false; end if;
  if not public.is_staff() and not coalesce(public.is_event_manager_of(e_id), false) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.applications set read_at = coalesce(read_at, p_read_at) where id = p_id;
  return found;
end $$;

-- ───────────── Events: the editor id is not public (A2), who edited last is a function (A3) ─────────────
revoke select on public.events from anon, authenticated;
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
    from information_schema.columns where table_schema = 'public' and table_name = 'events' and column_name <> 'updated_by';
  execute format('grant select (%s) on public.events to anon, authenticated', cols);
end $$;

create function public.event_updated_by(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('user_id', e.updated_by, 'name', coalesce(nullif(r.display_name, ''), nullif(p.full_name, ''), u.email))
  from public.events e
    join auth.users u on u.id = e.updated_by
    left join public.admin_roles r on r.user_id = u.id
    left join public.profiles p on p.id = u.id
  where e.id = p_id and (public.is_staff() or public.is_event_manager_of(p_id))
$$;
grant execute on function public.event_updated_by(uuid) to authenticated;

-- Only signed-in screens evaluate manager policies; the anonymous role never needs the helper.
revoke execute on function public.is_event_manager_of(uuid) from anon;

-- ───────────── Slug helpers the event editor calls while typing (A7) ─────────────
create function public.slug_taken(p_slug text, p_except uuid default null) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() and public.current_admin_role() is distinct from 'event_manager' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return exists (select 1 from public.events e where e.slug = p_slug and (p_except is null or e.id <> p_except))
    or exists (select 1 from public.slug_redirects r where r.old_slug = p_slug and (p_except is null or r.event_id <> p_except));
end $$;
grant execute on function public.slug_taken(text, uuid) to authenticated;

-- Which address an old or current slug belongs to, for visitors (301 redirect after a slug change).
create function public.resolve_event_address(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('slug', e.slug, 'is_current', e.slug = p_slug)
  from public.events e
  where (e.slug = p_slug or exists (select 1 from public.slug_redirects r where r.old_slug = p_slug and r.event_id = e.id))
    and e.status in ('published', 'hidden') and (e.publish_at is null or e.publish_at <= now())
  limit 1
$$;
grant execute on function public.resolve_event_address(text) to anon, authenticated;

-- ───────────── New rows go last (A11) ─────────────
-- -1 means "not given": an explicit 0 (the first item of a seeded list) is kept.
create function public.append_sort_order() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if new.sort_order = -1 then
    execute format('select coalesce(max(sort_order), -1) + 1 from public.%I', tg_table_name) into n;
    new.sort_order := n;
  end if;
  return new;
end $$;
create function public.append_sponsor_sort_order() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.sort_order = -1 then
    select coalesce(max(s.sort_order), -1) + 1 into new.sort_order from public.sponsors s where s.tier_id = new.tier_id;
  end if;
  return new;
end $$;
do $$
declare t text;
begin
  foreach t in array array['event_types', 'event_topics', 'sponsor_tiers', 'partner_packages', 'social_links'] loop
    execute format('alter table public.%I alter column sort_order set default -1', t);
    execute format('create trigger %I before insert on public.%I for each row execute function public.append_sort_order()', t || '_append_sort', t);
  end loop;
end $$;
alter table public.sponsors alter column sort_order set default -1;
create trigger sponsors_append_sort before insert on public.sponsors for each row execute function public.append_sponsor_sort_order();

-- ───────────── Committees: the home one cannot disappear, import is one call (A13) ─────────────
create function public.committees_home_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.is_home and coalesce(current_setting('eestec.purging', true), '') <> 'true' then
    raise exception 'The home committee cannot be deleted' using errcode = '23503';
  end if;
  return old;
end $$;
create trigger committees_home_guard before delete on public.committees for each row execute function public.committees_home_guard();

-- Upsert by (lower(name), country), the unique index PostgREST cannot target. The home flag never changes here.
create function public.import_committees(p_items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare item jsonb; existing uuid; created integer := 0; updated integer := 0;
begin
  perform public.require_staff();
  if jsonb_typeof(p_items) <> 'array' then raise exception 'Invalid committee list' using errcode = '22023'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    select c.id into existing from public.committees c where lower(c.name) = lower(trim(item->>'name')) and c.country = item->>'country';
    if existing is null then
      insert into public.committees(name, city, country, status, lat, lng, url)
        values (trim(item->>'name'), item->'city', item->>'country', (item->>'status')::public.committee_status,
          (item->>'lat')::double precision, (item->>'lng')::double precision, coalesce(item->>'url', ''));
      created := created + 1;
    else
      update public.committees set city = item->'city', status = (item->>'status')::public.committee_status,
        lat = (item->>'lat')::double precision, lng = (item->>'lng')::double precision, url = coalesce(item->>'url', '')
        where id = existing;
      updated := updated + 1;
    end if;
  end loop;
  return jsonb_build_object('created', created, 'updated', updated);
end $$;
grant execute on function public.import_committees(jsonb) to authenticated;

-- ───────────── Settings: only the three social platforms exist (A18) ─────────────
alter table public.social_links add constraint social_links_platform_check check (platform in ('instagram', 'facebook', 'linkedin'));

-- ───────────── Where a media file is used, before it is removed (A20) ─────────────
create function public.media_usage(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare usage jsonb;
begin
  perform public.require_staff();
  usage := jsonb_build_object(
    'events', (select count(*) from public.events where p_id in (cover_media_id, info_pack_id, seo_share_media_id))
      + (select count(*) from public.event_gallery where media_id = p_id),
    'sponsors', (select count(*) from public.sponsors where logo_media_id = p_id),
    'seo', (select count(*) from public.seo_pages where share_media_id = p_id),
    'profiles', (select count(*) from public.profiles where photo_media_id = p_id),
    'memories', (select count(*) from public.memories where cover_media_id = p_id)
      + (select count(*) from public.memory_photos where media_id = p_id)
      + (select count(*) from public.memory_revision_photos where media_id = p_id),
    'pages', (select count(*) from public.page_content where content::text like '%' || p_id::text || '%')
      + (select count(*) from public.site_settings where value::text like '%' || p_id::text || '%')
  );
  return usage || jsonb_build_object('total', (select coalesce(sum(value::integer), 0) from jsonb_each_text(usage)));
end $$;
grant execute on function public.media_usage(uuid) to authenticated;

-- ───────────── Events without a fee get the shape the app expects (A21) ─────────────
alter table public.events alter column fee set default '{"price": {"mk": ""}, "note": {"mk": ""}}';
create function public.events_fee_default() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.fee = '{}'::jsonb then new.fee := '{"price": {"mk": ""}, "note": {"mk": ""}}'::jsonb; end if;
  return new;
end $$;
create trigger events_fee_default before insert on public.events for each row execute function public.events_fee_default();
