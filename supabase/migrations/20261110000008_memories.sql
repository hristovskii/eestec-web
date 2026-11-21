-- M19c/d: member-authored Memories and their review workflow (D26–D27).
create extension if not exists unaccent with schema extensions;

create type public.memory_status as enum ('draft','pending','published','rejected');
create type public.memory_revision_status as enum ('pending','rejected');
create type public.memory_source as enum ('editor','impression');

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  author_deleted boolean not null default false,
  slug text unique check (slug is null or (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and slug not in ('new','edit','preview'))),
  status public.memory_status not null default 'draft', source public.memory_source not null default 'editor',
  title text not null default '', body text not null default '', event_id uuid references public.events(id) on delete set null,
  other_event_name text not null default '', city text not null default '', country text not null default '', happened_on date,
  cover_media_id uuid references public.media(id) on delete set null, cover_sample text, cover_alt text, cover_credit text,
  featured_on_home boolean not null default false, rejection_reason text not null default '',
  reviewed_by uuid references auth.users(id) on delete set null, reviewed_by_name text not null default '', reviewed_at timestamptz,
  submitted_at timestamptz, published_at timestamptz, reads_count integer not null default 0 check (reads_count >= 0),
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (not featured_on_home or status = 'published'),
  check (status <> 'published' or (slug is not null and published_at is not null)),
  check (not author_deleted or author_id is null)
);
create index memories_author_idx on public.memories(author_id);
create index memories_event_idx on public.memories(event_id);
create index memories_cover_idx on public.memories(cover_media_id);
create index memories_reviewer_idx on public.memories(reviewed_by);
create index memories_published_idx on public.memories(published_at desc) where status = 'published';
create index memories_year_idx on public.memories(coalesce(happened_on, (published_at at time zone 'Europe/Skopje')::date, (created_at at time zone 'Europe/Skopje')::date));
create index memories_sample_idx on public.memories(is_sample) where is_sample;
create trigger memories_touch before update on public.memories for each row execute function public.touch_updated_at();

create table public.memory_photos (
  id uuid primary key default gen_random_uuid(), memory_id uuid not null references public.memories(id) on delete cascade,
  media_id uuid references public.media(id) on delete restrict, sample_caption text,
  alt text not null default '', caption text not null default '', sort_order integer not null default 0,
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (media_id is not null or sample_caption is not null)
);
create index memory_photos_memory_idx on public.memory_photos(memory_id,sort_order);
create index memory_photos_media_idx on public.memory_photos(media_id);
create trigger memory_photos_touch before update on public.memory_photos for each row execute function public.touch_updated_at();

create table public.memory_revisions (
  id uuid primary key default gen_random_uuid(), memory_id uuid not null unique references public.memories(id) on delete cascade,
  status public.memory_revision_status not null default 'pending', content jsonb not null,
  reason text not null default '', reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_by_name text not null default '', reviewed_at timestamptz, submitted_at timestamptz not null default now(),
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (jsonb_typeof(content) = 'object')
);
create index memory_revisions_reviewer_idx on public.memory_revisions(reviewed_by);
create trigger memory_revisions_touch before update on public.memory_revisions for each row execute function public.touch_updated_at();

create table public.memory_revision_photos (
  id uuid primary key default gen_random_uuid(), revision_id uuid not null references public.memory_revisions(id) on delete cascade,
  media_id uuid references public.media(id) on delete restrict, sample_caption text,
  alt text not null default '', caption text not null default '', sort_order integer not null default 0,
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (media_id is not null or sample_caption is not null)
);
create index memory_revision_photos_revision_idx on public.memory_revision_photos(revision_id,sort_order);
create index memory_revision_photos_media_idx on public.memory_revision_photos(media_id);
create trigger memory_revision_photos_touch before update on public.memory_revision_photos for each row execute function public.touch_updated_at();

alter table public.memories enable row level security;
alter table public.memory_photos enable row level security;
alter table public.memory_revisions enable row level security;
alter table public.memory_revision_photos enable row level security;
-- Published rows are public, but the reviewer's account id, the review time and the moderation flags are not:
-- columns are granted one by one (reviewed_by and is_sample stay server-side for everyone).
grant select (id, author_id, author_deleted, slug, status, source, title, body, event_id, other_event_name, city, country, happened_on,
  cover_media_id, cover_sample, cover_alt, cover_credit, featured_on_home, rejection_reason, reviewed_by_name, reviewed_at,
  submitted_at, published_at, reads_count, created_at, updated_at) on public.memories to authenticated;
grant select (id, author_id, author_deleted, slug, status, source, title, body, event_id, other_event_name, city, country, happened_on,
  cover_media_id, cover_sample, cover_alt, cover_credit, featured_on_home, published_at, reads_count, created_at, updated_at)
  on public.memories to anon;
grant select on public.memory_photos to anon,authenticated;
grant select on public.memory_revisions,public.memory_revision_photos to authenticated;
create policy "memories: published" on public.memories for select using (status = 'published');
create policy "memories: own or staff" on public.memories for select to authenticated using (author_id = (select auth.uid()) or public.is_staff());
create policy "memory photos: visible memory" on public.memory_photos for select using (exists (select 1 from public.memories m where m.id = memory_id));
create policy "memory revisions: own or staff" on public.memory_revisions for select to authenticated using (
  public.is_staff() or exists (select 1 from public.memories m where m.id = memory_id and m.author_id = (select auth.uid()))
);
create policy "revision photos: visible revision" on public.memory_revision_photos for select to authenticated using (
  exists (select 1 from public.memory_revisions r where r.id = revision_id)
);

-- Each member action verifies the current account, never a caller-provided author id.
create function public.require_memory_author() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not public.is_active_member() then
    raise exception 'Active membership required' using errcode = '42501';
  end if;
  return (select auth.uid());
end $$;

-- Author input can reference a Memory photo they uploaded or one the Memory already uses (copied from a
-- feedback, or added by the board). Staff may use any Memory photo.
create function public.memory_validate_content(p_content jsonb,p_actor uuid,p_staff boolean,p_memory uuid default null) returns void
language plpgsql stable security definer set search_path = '' as $$
declare file_id uuid; item jsonb; sample_ok boolean;
begin
  if jsonb_typeof(p_content) <> 'object' or jsonb_typeof(coalesce(p_content->'photos','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_content->'photos','[]'::jsonb)) > 30
     or length(coalesce(p_content->>'title','')) > 90 or length(coalesce(p_content->>'body','')) > 60000 then
    raise exception 'Invalid Memory content' using errcode = '22023';
  end if;
  -- A placeholder photo (no file) is allowed only inside a sample Memory.
  select coalesce(bool_or(m.is_sample), false) into sample_ok from public.memories m where m.id = p_memory;
  for item in select value from jsonb_array_elements(coalesce(p_content->'photos','[]'::jsonb))
    union all select p_content->'cover' where jsonb_typeof(p_content->'cover') = 'object'
  loop
    file_id := nullif(item->>'fileId','')::uuid;
    if not p_staff and file_id is null and not (sample_ok and nullif(item->>'sample','') is not null) then
      raise exception 'A photo upload is required' using errcode = '22023';
    end if;
    if file_id is not null and not exists (
      select 1 from public.media m where m.id = file_id and m.bucket = 'memory-photos' and m.status = 'ready'
        and (p_staff or m.uploaded_by = p_actor or (p_memory is not null and file_id = any(public.memory_media_ids(p_memory))))
    ) then raise exception 'Photo is not available to this author' using errcode = '42501'; end if;
  end loop;
end $$;

create function public.memory_new_slug(p_title text) returns text
language plpgsql security definer set search_path = '' as $$
declare base text; candidate text; n integer := 1; pair text[]; result text := lower(coalesce(p_title,''));
begin
  perform pg_advisory_xact_lock(hashtextextended('eestec:memory-slugs',0));
  foreach pair slice 1 in array array[
    ['ѓ','gj'],['ж','zh'],['ѕ','dz'],['љ','lj'],['њ','nj'],['ќ','kj'],['ч','ch'],['џ','dj'],['ш','sh'],
    ['ђ','dj'],['ћ','c'],['й','j'],['щ','sht'],['ю','yu'],['я','ya'],['ё','e'],['ы','y'],['э','e']
  ] loop result := replace(result,pair[1],pair[2]); end loop;
  result := translate(result,'абвгдезијклмнопрстуфхцъь','abvgdezijklmnoprstufhca');
  result := replace(result,'&',' and ');
  base := trim(both '-' from regexp_replace(lower(extensions.unaccent(result)), '[^a-z0-9]+', '-', 'g'));
  base := coalesce(nullif(trim(both '-' from left(base,80)),''),'memory');
  candidate := base;
  while candidate in ('new','edit','preview') or exists (select 1 from public.memories m where m.slug = candidate) loop
    n := n + 1; candidate := trim(trailing '-' from left(base,80-length(n::text)-1)) || '-' || n;
  end loop;
  return candidate;
end $$;

-- This private helper replaces a draft or live content and its ordered photo uses atomically.
create function public.memory_apply_content(p_id uuid,p_content jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.memories set title = coalesce(p_content->>'title',''), body = coalesce(p_content->>'body',''),
    event_id = nullif(p_content->>'eventId','')::uuid, other_event_name = coalesce(p_content->>'otherEventName',''),
    city = coalesce(p_content->>'city',''), country = coalesce(p_content->>'country',''), happened_on = nullif(p_content->>'happenedOn','')::date,
    cover_media_id = nullif(p_content#>>'{cover,fileId}','')::uuid, cover_sample = p_content#>>'{cover,sample}',
    cover_alt = p_content#>>'{cover,alt}', cover_credit = p_content#>>'{cover,credit}' where id = p_id;
  delete from public.memory_photos where memory_id = p_id;
  insert into public.memory_photos(memory_id,media_id,sample_caption,alt,caption,sort_order)
    select p_id, nullif(v.value->>'fileId','')::uuid, v.value->>'sample', coalesce(v.value->>'alt',''),
      coalesce(v.value->>'caption',''), v.ordinality::integer
    from jsonb_array_elements(coalesce(p_content->'photos','[]'::jsonb)) with ordinality v(value,ordinality);
end $$;

create function public.memory_save_draft(p_id uuid,p_content jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.require_memory_author(); rec public.memories; mid uuid := p_id; before_files uuid[] := array[]::uuid[];
begin
  perform public.memory_validate_content(p_content,uid,false,p_id);
  if mid is null then
    insert into public.memories(author_id) values (uid) returning id into mid;
  else
    select * into rec from public.memories where id = mid for update;
    if not found or rec.author_id is distinct from uid then return jsonb_build_object('status','not_found'); end if;
    if rec.status not in ('draft','rejected') then return jsonb_build_object('status','locked'); end if;
    before_files := public.memory_media_ids(mid);
  end if;
  perform public.memory_apply_content(mid,p_content);
  perform public.memory_queue_unused_media(before_files);
  return jsonb_build_object('status','saved','id',mid);
end $$;
grant execute on function public.memory_save_draft(uuid,jsonb) to authenticated;

create function public.memory_submit(p_id uuid,p_content jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.require_memory_author(); rec public.memories; rid uuid; before_files uuid[];
begin
  perform public.memory_validate_content(p_content,uid,false,p_id);
  if nullif(trim(p_content->>'title'),'') is null or
     coalesce(nullif(trim(p_content->>'eventId'),''),nullif(trim(p_content->>'otherEventName'),'')) is null or
     nullif(trim(coalesce(p_content->>'city','')),'') is null or nullif(trim(coalesce(p_content->>'country','')),'') is null or
     nullif(trim(regexp_replace(replace(coalesce(p_content->>'body',''),'&nbsp;',' '),'<[^>]*>','','g')),'') is null or
     jsonb_typeof(p_content->'cover') is distinct from 'object' or nullif(trim(coalesce(p_content#>>'{cover,alt}','')),'') is null or
     exists(select 1 from jsonb_array_elements(coalesce(p_content->'photos','[]'::jsonb)) p where nullif(trim(coalesce(p->>'alt','')),'') is null) then
    raise exception 'Required Memory submission fields are missing' using errcode = '22023';
  end if;
  select * into rec from public.memories where id = p_id for update;
  if not found or rec.author_id is distinct from uid then return jsonb_build_object('status','not_found'); end if;
  if rec.status = 'pending' then return jsonb_build_object('status','locked'); end if;
  before_files := public.memory_media_ids(p_id);
  if rec.status = 'published' then
    insert into public.memory_revisions(memory_id,content,status,submitted_at)
      values (p_id,p_content - 'photos','pending',now())
      on conflict(memory_id) do update set content = excluded.content,status = 'pending',reason = '',reviewed_by = null,reviewed_by_name = '',reviewed_at = null,submitted_at = now()
      returning id into rid;
    delete from public.memory_revision_photos where revision_id = rid;
    insert into public.memory_revision_photos(revision_id,media_id,sample_caption,alt,caption,sort_order)
      select rid,nullif(v.value->>'fileId','')::uuid,v.value->>'sample',coalesce(v.value->>'alt',''),coalesce(v.value->>'caption',''),v.ordinality::integer
      from jsonb_array_elements(coalesce(p_content->'photos','[]'::jsonb)) with ordinality v(value,ordinality);
    perform public.memory_queue_unused_media(before_files);
    return jsonb_build_object('status','submitted','id',p_id,'revision',true);
  end if;
  perform public.memory_apply_content(p_id,p_content);
  update public.memories set status = 'pending', slug = coalesce(rec.slug,public.memory_new_slug(p_content->>'title')),
    rejection_reason = '',submitted_at = now() where id = p_id;
  perform public.memory_queue_unused_media(before_files);
  return jsonb_build_object('status','submitted','id',p_id,'revision',false);
end $$;
grant execute on function public.memory_submit(uuid,jsonb) to authenticated;

-- Only unused Memory files are queued; current and pending/rejected versions can share a file.
create function public.memory_media_ids(p_id uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct media_id) filter (where media_id is not null),array[]::uuid[]) from (
    select cover_media_id as media_id from public.memories where id = p_id
    union all select media_id from public.memory_photos where memory_id = p_id
    union all select nullif(r.content#>>'{cover,fileId}','')::uuid from public.memory_revisions r where r.memory_id = p_id
    union all select p.media_id from public.memory_revision_photos p join public.memory_revisions r on r.id = p.revision_id where r.memory_id = p_id
  ) files
$$;
create function public.memory_queue_unused_media(p_ids uuid[]) returns void
language sql security definer set search_path = '' as $$
  insert into public.storage_cleanup_queue(bucket,path,reason)
  select m.bucket,m.path,'unused Memory photo' from public.media m
  where m.id = any(p_ids) and m.bucket = 'memory-photos' and m.path is not null
    and not exists (select 1 from public.memories a where a.cover_media_id = m.id)
    and not exists (select 1 from public.memory_photos p where p.media_id = m.id)
    and not exists (select 1 from public.memory_revisions r where nullif(r.content#>>'{cover,fileId}','')::uuid = m.id)
    and not exists (select 1 from public.memory_revision_photos p where p.media_id = m.id)
    and not exists (select 1 from public.profiles p where p.photo_media_id = m.id)
    and not exists (select 1 from public.events e where m.id in (e.cover_media_id,e.info_pack_id,e.seo_share_media_id))
    and not exists (select 1 from public.event_gallery g where g.media_id = m.id)
    and not exists (select 1 from public.storage_cleanup_queue q where q.bucket = m.bucket and q.path = m.path)
$$;

create function public.memory_decide(p_id uuid,p_approve boolean,p_reason text default '',p_featured boolean default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare rec public.memories; rev public.memory_revisions; before_files uuid[]; data jsonb; reviewer text;
begin
  perform public.require_staff();
  select * into rec from public.memories where id = p_id for update;
  if not found then return jsonb_build_object('status','not_found'); end if;
  select coalesce(nullif(r.display_name,''),nullif(p.full_name,''),u.email) into reviewer
    from auth.users u left join public.admin_roles r on r.user_id = u.id left join public.profiles p on p.id = u.id
    where u.id = (select auth.uid());
  before_files := public.memory_media_ids(p_id);
  if rec.status = 'pending' then
    if p_approve then
      update public.memories set status = 'published', published_at = now(), reviewed_by = (select auth.uid()),
        reviewed_by_name = coalesce(reviewer,''), reviewed_at = now(), rejection_reason = '',
        featured_on_home = coalesce(p_featured,false) where id = p_id;
      return jsonb_build_object('status','approved','kind','memory');
    end if;
    update public.memories set status = 'rejected',rejection_reason = trim(coalesce(p_reason,'')),
      reviewed_by = (select auth.uid()),reviewed_by_name = coalesce(reviewer,''),reviewed_at = now() where id = p_id;
    return jsonb_build_object('status','rejected','kind','memory');
  end if;
  select * into rev from public.memory_revisions where memory_id = p_id and status = 'pending' for update;
  if rec.status <> 'published' or not found then return jsonb_build_object('status','not_pending'); end if;
  if not p_approve then
    update public.memory_revisions set status = 'rejected',reason = trim(coalesce(p_reason,'')),
      reviewed_by = (select auth.uid()),reviewed_by_name = coalesce(reviewer,''),reviewed_at = now() where id = rev.id;
    return jsonb_build_object('status','rejected','kind','revision');
  end if;
  select rev.content || jsonb_build_object('photos',coalesce(jsonb_agg(jsonb_build_object(
    'fileId',p.media_id,'sample',p.sample_caption,'alt',p.alt,'caption',p.caption) order by p.sort_order)
    filter (where p.id is not null),'[]'::jsonb)) into data
    from public.memory_revision_photos p where p.revision_id = rev.id;
  perform public.memory_apply_content(p_id,data);
  delete from public.memory_revisions where id = rev.id;
  update public.memories set reviewed_by = (select auth.uid()),reviewed_by_name = coalesce(reviewer,''),reviewed_at = now(),
    featured_on_home = coalesce(p_featured,rec.featured_on_home) where id = p_id;
  perform public.memory_queue_unused_media(before_files);
  return jsonb_build_object('status','approved','kind','revision');
end $$;
grant execute on function public.memory_decide(uuid,boolean,text,boolean) to authenticated;

create function public.memory_unpublish(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare before_files uuid[];
begin
  perform public.require_staff();
  perform 1 from public.memories where id = p_id for update;
  if not found then return false; end if;
  before_files := public.memory_media_ids(p_id);
  delete from public.memory_revisions where memory_id = p_id;
  update public.memories set status = 'draft',published_at = null,featured_on_home = false where id = p_id and status = 'published';
  perform public.memory_queue_unused_media(before_files);
  return true;
end $$;
grant execute on function public.memory_unpublish(uuid) to authenticated;

create function public.memory_discard(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.require_memory_author(); rec public.memories; before_files uuid[];
begin
  select * into rec from public.memories where id = p_id for update;
  if not found or rec.author_id is distinct from uid or rec.status not in ('draft','rejected') then return false; end if;
  before_files := public.memory_media_ids(p_id);
  delete from public.memories where id = p_id;
  perform public.memory_queue_unused_media(before_files);
  return true;
end $$;
grant execute on function public.memory_discard(uuid) to authenticated;

create function public.memory_admin_remove(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare before_files uuid[];
begin
  perform public.require_staff();
  perform 1 from public.memories where id = p_id for update;
  if not found then return false; end if;
  before_files := public.memory_media_ids(p_id);
  delete from public.memories where id = p_id;
  perform public.memory_queue_unused_media(before_files);
  return true;
end $$;
grant execute on function public.memory_admin_remove(uuid) to authenticated;

create function public.memory_count_read(p_slug text) returns void
language sql security definer set search_path = '' as $$
  update public.memories set reads_count = reads_count + 1
  where slug = p_slug and status = 'published' and ((select auth.uid()) is null or author_id is distinct from (select auth.uid()))
$$;
grant execute on function public.memory_count_read(text) to anon,authenticated;

create function public.memory_admin_save(p_id uuid,p_content jsonb,p_revision boolean,p_featured boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare rid uuid; before_files uuid[];
begin
  perform public.require_staff();
  perform public.memory_validate_content(p_content,(select auth.uid()),true);
  perform 1 from public.memories where id = p_id for update;
  if not found then return false; end if;
  before_files := public.memory_media_ids(p_id);
  if p_revision then
    select id into rid from public.memory_revisions where memory_id = p_id for update;
    if rid is null then return false; end if;
    update public.memory_revisions set content = p_content - 'photos' where id = rid;
    delete from public.memory_revision_photos where revision_id = rid;
    insert into public.memory_revision_photos(revision_id,media_id,sample_caption,alt,caption,sort_order)
      select rid,nullif(v.value->>'fileId','')::uuid,v.value->>'sample',coalesce(v.value->>'alt',''),coalesce(v.value->>'caption',''),v.ordinality::integer
      from jsonb_array_elements(coalesce(p_content->'photos','[]'::jsonb)) with ordinality v(value,ordinality);
  else
    perform public.memory_apply_content(p_id,p_content);
  end if;
  update public.memories set featured_on_home = case when status = 'published' then coalesce(p_featured,false) else false end where id = p_id;
  perform public.memory_queue_unused_media(before_files);
  return true;
end $$;
grant execute on function public.memory_admin_save(uuid,jsonb,boolean,boolean) to authenticated;

create function public.memory_set_featured(p_id uuid,p_featured boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_staff();
  update public.memories set featured_on_home = p_featured where id = p_id and status = 'published';
  return found;
end $$;
grant execute on function public.memory_set_featured(uuid,boolean) to authenticated;

-- The caller's RLS applies to the queue (reviewers see all of it, an author only their own waiting items).
create view public.memory_queue with (security_invoker = true) as
  select m.id, 'memory'::text as kind, m.author_id, m.submitted_at, m.title, m.event_id, m.other_event_name,
    (select count(*) from public.memory_photos p where p.memory_id = m.id)::integer as photo_count
  from public.memories m where m.status = 'pending'
  union all
  select m.id, 'revision'::text, m.author_id, r.submitted_at, coalesce(r.content->>'title', m.title),
    nullif(r.content->>'eventId','')::uuid, coalesce(r.content->>'otherEventName', ''),
    (select count(*) from public.memory_revision_photos p where p.revision_id = r.id)::integer
  from public.memories m join public.memory_revisions r on r.memory_id = m.id where m.status = 'published' and r.status = 'pending';
grant select on public.memory_queue to authenticated;

-- Searching Memories by title or place uses substring matching; trigram indexes keep it fast.
create extension if not exists pg_trgm with schema extensions;
create index memories_title_trgm_idx on public.memories using gin (lower(title) extensions.gin_trgm_ops);
create index memories_city_trgm_idx on public.memories using gin (lower(city) extensions.gin_trgm_ops);
