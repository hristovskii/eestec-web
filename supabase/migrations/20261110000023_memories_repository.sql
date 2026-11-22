-- M20h: what the Memories repository needs from SQL beyond M19c.

-- ───────────── Photos in Storage ─────────────
-- An author uploads into their own folder (`<user id>/<file id>.<ext>`) with their own session; `register_memory_photo`
-- then makes it a media row. A photo is read only where `can_read_memory_photo` says so (published Memories to everyone,
-- a draft to its author and staff): no signed URLs, the app's route reads Storage as the viewer, like avatars (D40).
create policy "memory photos: members add to their own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'memory-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_member() and not public.account_deletion_pending((select auth.uid())));
create policy "memory photos: read what the Memory allows" on storage.objects for select to anon, authenticated
  using (bucket_id = 'memory-photos' and public.can_read_memory_photo(name));

-- Registers an uploaded file for the signed-in member. The sizes are the browser's (it makes the JPEG), kept so a page can
-- reserve the room before the image loads. Returns the media id the editor uses as `fileId`.
create function public.register_memory_photo(p_path text, p_mime text, p_size integer, p_width integer, p_height integer)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_memory_author();
  new_id uuid;
begin
  if public.account_deletion_pending(uid) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_path is null or (storage.foldername(p_path))[1] is distinct from uid::text
     or not exists (select 1 from storage.objects where bucket_id = 'memory-photos' and name = p_path) then
    raise exception 'The photo is not in your folder' using errcode = '22023';
  end if;
  if p_width not between 1 and 6000 or p_height not between 1 and 6000 then
    raise exception 'The photo size is not valid' using errcode = '22023';
  end if;
  insert into public.media (bucket, path, kind, file_name, mime_type, size_bytes, width, height, uploaded_by)
    values ('memory-photos', p_path, 'image', 'photo', p_mime, p_size, p_width, p_height, uid)
    returning id into new_id;
  return new_id;
end $$;
grant execute on function public.register_memory_photo(text, text, integer, integer, integer) to authenticated;

-- The size of Memory photos by media id. Media rows of this bucket are not readable by visitors, and the size says
-- nothing about the photo, so everyone may ask.
create function public.memory_media_sizes(p_ids uuid[]) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(m.id, jsonb_build_object('width', m.width, 'height', m.height)), '{}'::jsonb)
  from public.media m
  where m.id = any (p_ids) and m.bucket = 'memory-photos' and m.width is not null and m.height is not null
$$;
grant execute on function public.memory_media_sizes(uuid[]) to anon, authenticated;

-- Where the file of a Memory photo is, if this viewer may see it (the same rule as the Storage policy above): the
-- route that serves photos asks this, then reads Storage as the viewer. null: not there or not allowed.
create function public.memory_photo_path(p_media uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.path from public.media m
  where m.id = p_media and m.bucket = 'memory-photos' and m.path is not null and public.can_read_memory_photo(m.path)
$$;
grant execute on function public.memory_photo_path(uuid) to anon, authenticated;

-- ───────────── The public list ─────────────
-- Which published Memories match, in which order, and how many there are in all. The caller's row policy applies; the
-- status filter keeps a signed-in author's drafts and staff's everything out. Search is a substring match on title, text
-- (tags left out), place and event name; the year is the Skopje year of the date it happened (else of publishing).
-- Newest first (published, then id); `p_featured_first` lifts the ones the board features on Home to the top.
create function public.memory_page(
  p_q text default '', p_event uuid default null, p_year integer default null, p_place text default null,
  p_author uuid default null, p_sort text default 'newest', p_featured_first boolean default false,
  p_exclude uuid default null, p_limit integer default 12, p_offset integer default 0
) returns jsonb
language sql stable set search_path = '' as $$
  with q as (
    select case when trim(coalesce(p_q, '')) = '' then null
      else '%' || replace(replace(replace(lower(trim(p_q)), '\', '\\'), '%', '\%'), '_', '\_') || '%' end as pat
  ), hit as (
    select m.id, m.featured_on_home, m.published_at
    from public.memories m cross join q
    where m.status = 'published'
      and (p_event is null or m.event_id = p_event)
      and (p_year is null or extract(year from coalesce(m.happened_on,
            (m.published_at at time zone 'Europe/Skopje')::date, (m.created_at at time zone 'Europe/Skopje')::date))::integer = p_year)
      and (p_place is null or lower(concat_ws(', ', nullif(trim(m.city), ''), nullif(trim(m.country), ''))) = lower(trim(p_place)))
      and (p_author is null or m.author_id = p_author)
      and (p_exclude is null or m.id <> p_exclude)
      and (q.pat is null
        or lower(m.title) like q.pat escape '\'
        or lower(regexp_replace(m.body, '<[^>]*>', ' ', 'g')) like q.pat escape '\'
        or lower(concat_ws(', ', nullif(trim(m.city), ''), nullif(trim(m.country), ''))) like q.pat escape '\'
        or lower(m.other_event_name) like q.pat escape '\')
  )
  select jsonb_build_object(
    'total', (select count(*) from hit),
    'ids', coalesce((select jsonb_agg(s.id order by s.n) from (
      select id, row_number() over (
        order by case when p_featured_first and featured_on_home then 0 else 1 end,
                 case when p_sort = 'oldest' then published_at end asc nulls last,
                 published_at desc, id) as n
      from hit order by n limit greatest(p_limit, 0) offset greatest(p_offset, 0)) s), '[]'::jsonb))
$$;
grant execute on function public.memory_page(text, uuid, integer, text, uuid, text, boolean, uuid, integer, integer) to anon, authenticated;

-- What the filters offer and the numbers under the intro, over the published Memories.
create function public.memory_facets() returns jsonb
language sql stable set search_path = '' as $$
  with pub as (
    select m.event_id, m.author_id, m.other_event_name,
      extract(year from coalesce(m.happened_on, (m.published_at at time zone 'Europe/Skopje')::date,
        (m.created_at at time zone 'Europe/Skopje')::date))::integer as year,
      nullif(trim(m.city), '') as city,
      concat_ws(', ', nullif(trim(m.city), ''), nullif(trim(m.country), '')) as place
    from public.memories m where m.status = 'published'
  )
  select jsonb_build_object(
    'events', coalesce((select jsonb_agg(jsonb_build_object('eventId', event_id, 'count', n) order by event_id)
      from (select event_id, count(*) as n from pub where event_id is not null group by event_id) e), '[]'::jsonb),
    'years', coalesce((select jsonb_agg(year order by year desc) from (select distinct year from pub) y), '[]'::jsonb),
    'places', coalesce((select jsonb_agg(place order by place) from (
      select distinct on (lower(place)) place from pub where place <> '' order by lower(place), place) p), '[]'::jsonb),
    'authors', coalesce((select jsonb_agg(jsonb_build_object('authorId', author_id, 'count', n) order by author_id)
      from (select author_id, count(*) as n from pub where author_id is not null group by author_id) a), '[]'::jsonb),
    'totals', jsonb_build_object(
      'stories', (select count(*) from pub),
      'events', (select count(distinct event_id) from pub where event_id is not null)
        + (select count(distinct lower(other_event_name)) from pub where event_id is null and other_event_name <> ''),
      'cities', (select count(distinct lower(city)) from pub where city is not null))
  )
$$;
grant execute on function public.memory_facets() to anon, authenticated;

-- ───────────── Admin › Memories: the tab numbers ─────────────
-- One count per status, all, and the changes to published Memories that wait. Staff see every row; anyone else only their own.
create function public.memory_admin_counts() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'draft', count(*) filter (where status = 'draft'),
    'pending', count(*) filter (where status = 'pending'),
    'published', count(*) filter (where status = 'published'),
    'rejected', count(*) filter (where status = 'rejected'),
    'all', count(*),
    'revisions', (select count(*) from public.memory_revisions r join public.memories x on x.id = r.memory_id
                  where x.status = 'published' and r.status = 'pending'))
  from public.memories
$$;
grant execute on function public.memory_admin_counts() to authenticated;
