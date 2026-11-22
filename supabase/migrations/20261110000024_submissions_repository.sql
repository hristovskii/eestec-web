-- M20h2: what the idea form and the submissions repositories need from SQL beyond M19c.

-- ───────────── The board reads private files ─────────────
-- Files that came with an idea or a piece of feedback live in the private `submissions` bucket. The app's server
-- stores them (service role); the board reads them as themselves. Event managers never do (D29, D33): `is_staff()` is
-- super admins and editors only. No signed URLs: the route reads Storage as the signed-in person.
create policy "submissions: staff read" on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and public.is_staff());

-- ───────────── One submission as the app reads it ─────────────
-- Internal builders (no grant): the stored row and its files, so a submit returns exactly what a list would read.
create function public.idea_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select (to_jsonb(i) - 'reference' - 'is_sample') || jsonb_build_object('files', coalesce((
    select jsonb_agg(jsonb_build_object('path', f.path, 'file_name', f.file_name, 'mime_type', f.mime_type,
      'size_bytes', f.size_bytes) order by f.sort_order, f.created_at)
    from public.submission_files f where f.idea_id = i.id), '[]'::jsonb))
  from public.ideas i where i.id = p_id
$$;

create function public.feedback_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select (to_jsonb(f) - 'reference' - 'is_sample') || jsonb_build_object('files', coalesce((
    select jsonb_agg(jsonb_build_object('path', x.path, 'file_name', x.file_name, 'mime_type', x.mime_type,
      'size_bytes', x.size_bytes) order by x.sort_order, x.created_at)
    from public.submission_files x where x.feedback_id = f.id), '[]'::jsonb))
  from public.feedback f where f.id = p_id
$$;

-- ───────────── Submit: the app's clock, the stored row, files that exist ─────────────
-- Same functions as in 0009 plus `p_now` (consent time, creation time and the year of the reference, as the repositories
-- take `now` from the caller; rule 12), the stored row as the result, and a check that each file was really uploaded.
drop function public.submit_idea(uuid, text, text, text, boolean, text, text, uuid, boolean, jsonb);
create function public.submit_idea(p_type uuid, p_title text, p_description text, p_locale text, p_anonymous boolean,
  p_name text, p_email text, p_profile uuid, p_consent boolean, p_attachment jsonb default null,
  p_now timestamptz default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  result public.ideas;
  ref text;
  stamp timestamptz := coalesce(p_now, now());
  y integer := extract(year from coalesce(p_now, now()) at time zone 'Europe/Skopje');
begin
  if p_anonymous is null or p_locale not in ('mk', 'en') or nullif(trim(p_title), '') is null
     or nullif(trim(p_description), '') is null then
    raise exception 'Invalid idea' using errcode = '22023';
  end if;
  if not p_anonymous and nullif(trim(p_email), '') is not null and p_consent is not true and p_profile is null then
    raise exception 'Consent required' using errcode = '22023';
  end if;
  if not p_anonymous and p_profile is not null and not exists (select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = p_profile and u.email_confirmed_at is not null and lower(trim(u.email)) = lower(trim(p_email))) then
    raise exception 'Unverified member' using errcode = '42501';
  end if;
  if p_attachment is not null and p_attachment <> 'null'::jsonb and not exists (
    select 1 from storage.objects where bucket_id = 'submissions' and name = p_attachment ->> 'path') then
    raise exception 'The attachment was not uploaded' using errcode = '22023';
  end if;
  ref := 'IDE-' || y || '-' || public.reference_suffix(public.next_reference_number('idea', y));
  insert into public.ideas (reference, type_id, title, description, locale, is_anonymous, name, email, user_id, consent_at, created_at)
    values (ref, p_type, trim(p_title), trim(p_description), p_locale, p_anonymous,
      case when p_anonymous then null else nullif(trim(p_name), '') end,
      case when p_anonymous then null else nullif(trim(p_email), '') end,
      case when p_anonymous then null else p_profile end,
      case when p_anonymous or nullif(trim(p_email), '') is null then null else stamp end, stamp)
    returning * into result;
  if p_attachment is not null and p_attachment <> 'null'::jsonb then
    insert into public.submission_files (idea_id, path, file_name, mime_type, size_bytes)
      values (result.id, p_attachment ->> 'path', p_attachment ->> 'name', p_attachment ->> 'mime', (p_attachment ->> 'size')::integer);
  end if;
  return public.idea_json(result.id);
end $$;
grant execute on function public.submit_idea(uuid, text, text, text, boolean, text, text, uuid, boolean, jsonb, timestamptz) to service_role;

drop function public.submit_impression(uuid, text, text, integer, text, text, boolean, text, text, uuid, boolean, jsonb, jsonb);
create function public.submit_impression(p_event uuid, p_other_event text, p_event_title text, p_rating integer, p_text text,
  p_locale text, p_anonymous boolean, p_name text, p_email text, p_profile uuid, p_consent boolean,
  p_files jsonb default '[]', p_memory_content jsonb default null, p_now timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  result public.feedback;
  ref text;
  stamp timestamptz := coalesce(p_now, now());
  y integer := extract(year from coalesce(p_now, now()) at time zone 'Europe/Skopje');
  f jsonb;
  file_position integer := 0;
  mid uuid;
  member_status public.profile_status;
begin
  if p_anonymous is null or p_locale not in ('mk', 'en') or p_event_title is null
     or (p_rating is not null and p_rating not between 1 and 5)
     or jsonb_typeof(p_files) <> 'array' or jsonb_array_length(p_files) > 10 then
    raise exception 'Invalid feedback' using errcode = '22023';
  end if;
  if not p_anonymous and nullif(trim(p_email), '') is not null and p_consent is not true and p_profile is null then
    raise exception 'Consent required' using errcode = '22023';
  end if;
  if not p_anonymous and p_profile is not null then
    select p.status into member_status from public.profiles p join auth.users u on u.id = p.id
      where p.id = p_profile and u.email_confirmed_at is not null and lower(trim(u.email)) = lower(trim(p_email));
    if not found then raise exception 'Unverified member' using errcode = '42501'; end if;
  end if;
  for f in select value from jsonb_array_elements(p_files) loop
    if not exists (select 1 from storage.objects where bucket_id = 'submissions' and name = f ->> 'path') then
      raise exception 'A photo was not uploaded' using errcode = '22023';
    end if;
  end loop;
  if p_memory_content is not null and p_memory_content <> 'null'::jsonb then
    if p_anonymous or p_profile is null or member_status not in ('active', 'alumni') then
      raise exception 'Only identified members may create a Memory' using errcode = '42501';
    end if;
    perform public.memory_validate_content(p_memory_content, p_profile, false);
    if nullif(trim(p_memory_content ->> 'title'), '') is null or nullif(trim(p_memory_content ->> 'body'), '') is null then
      raise exception 'Memory title and content required' using errcode = '22023';
    end if;
    insert into public.memories (author_id, source, status, slug, submitted_at)
      values (p_profile, 'impression', 'pending', public.memory_new_slug(p_memory_content ->> 'title'), stamp)
      returning id into mid;
    perform public.memory_apply_content(mid, p_memory_content);
  end if;
  ref := 'FDB-' || y || '-' || public.reference_suffix(public.next_reference_number('feedback', y));
  insert into public.feedback (reference, event_id, other_event_name, event_title, rating, impression, locale, is_anonymous,
      name, email, user_id, consent_at, memory_id, created_at)
    values (ref, p_event, case when p_event is null then coalesce(p_other_event, '') else '' end, p_event_title, p_rating,
      coalesce(p_text, ''), p_locale, p_anonymous,
      case when p_anonymous then null else nullif(trim(p_name), '') end,
      case when p_anonymous then null else nullif(trim(p_email), '') end,
      case when p_anonymous then null else p_profile end,
      case when p_anonymous or nullif(trim(p_email), '') is null then null else stamp end, mid, stamp)
    returning * into result;
  for f in select value from jsonb_array_elements(p_files) loop
    file_position := file_position + 1;
    insert into public.submission_files (feedback_id, path, file_name, mime_type, size_bytes, sort_order)
      values (result.id, f ->> 'path', f ->> 'name', f ->> 'mime', (f ->> 'size')::integer, file_position);
  end loop;
  return public.feedback_json(result.id);
end $$;
grant execute on function public.submit_impression(uuid, text, text, integer, text, text, boolean, text, text, uuid, boolean, jsonb, jsonb, timestamptz) to service_role;

-- ───────────── Handling ─────────────
-- Counts per status, for the tabs. The caller's row policy applies: the board sees every row, everyone else none.
create function public.submission_counts(p_kind text) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'all', count(*),
    'new', count(*) filter (where status = 'new'),
    'under_review', count(*) filter (where status = 'under_review'),
    'accepted', count(*) filter (where status = 'accepted'),
    'archived', count(*) filter (where status = 'archived'))
  from (select status from public.ideas where p_kind = 'idea'
        union all select status from public.feedback where p_kind = 'feedback') s
$$;
grant execute on function public.submission_counts(text) to authenticated;

-- "Accept and create event draft": the app makes the draft with the events code; this remembers it on the idea.
create function public.link_idea_event_draft(p_id uuid, p_event uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_staff();
  update public.ideas set event_draft_id = p_event where id = p_id;
  return found;
end $$;
grant execute on function public.link_idea_event_draft(uuid, uuid) to authenticated;

-- One piece of feedback as an event manager may see it (D33), by id: nothing for anyone else's event.
create function public.feedback_for_manager(p_id uuid) returns table (
  id uuid, reference text, event_id uuid, event_title text, rating integer, impression text,
  status public.submission_status, locale text, created_at timestamptz
) language sql stable security definer set search_path = '' as $$
  select f.id, f.reference, f.event_id, f.event_title, f.rating, f.impression, f.status, f.locale, f.created_at
  from public.feedback f
  where f.id = p_id and (public.is_staff() or (f.event_id is not null and public.is_event_manager_of(f.event_id)))
$$;
grant execute on function public.feedback_for_manager(uuid) to authenticated;

-- ───────────── Form settings ─────────────
-- The two intro texts and the idea types in one transaction. A type with an id that exists is renamed and ordered; any
-- other (no id, or one that is not a type) is new; a type left out is removed, and one that ideas use refuses (23503).
create function public.save_idea_form(p_intro jsonb, p_types jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t jsonb;
  position_ integer := 0;
  keep uuid[] := array[]::uuid[];
  tid uuid;
begin
  perform public.require_staff();
  if jsonb_typeof(p_intro) <> 'object' or jsonb_typeof(p_types) <> 'array' or jsonb_array_length(p_types) = 0 then
    raise exception 'Invalid form settings' using errcode = '22023';
  end if;
  insert into public.page_content (page, content) values ('submit', jsonb_build_object('intro', p_intro))
    on conflict (page) do update set content = coalesce(public.page_content.content, '{}'::jsonb) || jsonb_build_object('intro', p_intro);
  for t in select value from jsonb_array_elements(p_types) loop
    tid := null;
    if (t ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select id into tid from public.idea_types where id = (t ->> 'id')::uuid;
    end if;
    if tid is not null then
      update public.idea_types set name = t -> 'name', sort_order = position_ where id = tid;
    else
      insert into public.idea_types (name, sort_order) values (t -> 'name', position_) returning id into tid;
    end if;
    keep := keep || tid;
    position_ := position_ + 1;
  end loop;
  delete from public.idea_types where id <> all (keep);
end $$;
grant execute on function public.save_idea_form(jsonb, jsonb) to authenticated;
