-- M19b: events and partners. Hidden events can be reached by slug, but cannot be listed.
create type public.event_status as enum ('draft', 'published', 'hidden');
create type public.event_scope as enum ('local', 'international');
create type public.event_admission as enum ('selection', 'first_come');
create type public.event_apply_via as enum ('form', 'external');
create type public.sponsor_tier_size as enum ('large', 'medium', 'small');

create table public.event_types (
  id uuid primary key default gen_random_uuid(), name jsonb not null check (public.is_localized(name)),
  sort_order integer not null default 0, is_sample boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.event_topics (
  id uuid primary key default gen_random_uuid(), name jsonb not null check (public.is_localized(name)),
  sort_order integer not null default 0, is_sample boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.sponsor_tiers (
  id uuid primary key default gen_random_uuid(), name jsonb not null check (public.is_localized(name)),
  size public.sponsor_tier_size not null, sort_order integer not null default 0,
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.sponsors (
  id uuid primary key default gen_random_uuid(), name text not null,
  logo_media_id uuid references public.media(id) on delete set null, logo_alt text, logo_credit text,
  website_url text not null default '' check (website_url = '' or website_url ~ '^https://'),
  tier_id uuid not null references public.sponsor_tiers(id) on delete restrict,
  active_from date, active_to date, is_active boolean not null default true, sort_order integer not null default 0,
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (active_from is null or active_to is null or active_to >= active_from)
);
create index sponsors_tier_idx on public.sponsors(tier_id);
create index sponsors_logo_idx on public.sponsors(logo_media_id);
create table public.partner_packages (
  id uuid primary key default gen_random_uuid(), name jsonb not null check (public.is_localized(name)),
  text jsonb not null check (public.is_localized(text)), price_text jsonb not null check (public.is_localized(price_text)),
  items jsonb not null default '[]', highlighted boolean not null default false, cta jsonb not null check (public.is_localized(cta)),
  sort_order integer not null default 0, is_sample boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index partner_packages_one_highlight on public.partner_packages(highlighted) where highlighted;

create function public.event_agenda_valid(p_agenda jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(p_agenda) <> 'array' then false else not exists (
    select 1 from jsonb_array_elements(p_agenda) item
    where not coalesce(public.is_localized(item->'title'),false) or nullif(trim(item->'title'->>'mk'),'') is null
  ) end
$$;

create table public.events (
  id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title jsonb not null check (public.is_localized(title)), short_description jsonb not null check (public.is_localized(short_description)),
  scope public.event_scope not null, type_id uuid not null references public.event_types(id) on delete restrict,
  starts_at timestamptz not null, ends_at timestamptz not null, all_day boolean not null default false,
  location jsonb not null check (public.is_localized(location)), city jsonb not null check (public.is_localized(city)),
  country jsonb not null check (public.is_localized(country)), organizer text,
  description jsonb not null check (public.is_localized(description)), agenda jsonb not null default '[]',
  requirements jsonb not null check (public.is_localized(requirements)), fee jsonb not null default '{}',
  contact_email text not null default '', participant_count integer check (participant_count >= 0), country_count integer check (country_count >= 0),
  cover_media_id uuid references public.media(id) on delete set null, cover_alt text, cover_credit text,
  info_pack_id uuid references public.media(id) on delete set null, video_url text not null default '',
  status public.event_status not null default 'draft', publish_at timestamptz, next_up boolean not null default false,
  applications_enabled boolean not null default false, apply_via public.event_apply_via not null default 'form', external_url text not null default '',
  opens_at timestamptz, deadline timestamptz, results_on date, max_participants integer check (max_participants >= 1),
  waitlist boolean not null default false, admission public.event_admission not null default 'selection',
  seo_title jsonb not null check (public.is_localized(seo_title)), seo_description jsonb not null check (public.is_localized(seo_description)),
  seo_share_media_id uuid references public.media(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (ends_at >= starts_at),
  check (status = 'draft' or (length(trim(title->>'mk')) > 0 and length(trim(short_description->>'mk')) > 0 and length(trim(location->>'mk')) > 0)),
  check (status = 'draft' or cover_media_id is null or nullif(trim(cover_alt), '') is not null),
  check (jsonb_typeof(agenda) = 'array'),
  check (status = 'draft' or public.event_agenda_valid(agenda)),
  check (status = 'draft' or not applications_enabled or
    (apply_via = 'external' and length(trim(external_url)) > 0) or
    (apply_via = 'form' and deadline is not null and deadline <= ends_at and (opens_at is null or opens_at < deadline)))
);
create index events_timing_idx on public.events(status, starts_at, ends_at);
create index events_type_idx on public.events(type_id);
create index events_cover_idx on public.events(cover_media_id);
create index events_info_pack_idx on public.events(info_pack_id);
create index events_share_idx on public.events(seo_share_media_id);
create index events_updated_by_idx on public.events(updated_by);
create table public.event_topic_links (
  event_id uuid not null references public.events(id) on delete cascade,
  topic_id uuid not null references public.event_topics(id) on delete cascade, primary key(event_id, topic_id)
);
create index event_topic_links_topic_idx on public.event_topic_links(topic_id);
create table public.event_gallery (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete restrict, alt text, credit text, sort_order integer not null default 0,
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index event_gallery_event_idx on public.event_gallery(event_id, sort_order);
create index event_gallery_media_idx on public.event_gallery(media_id);
create table public.event_partners (
  event_id uuid not null references public.events(id) on delete cascade,
  sponsor_id uuid not null references public.sponsors(id) on delete restrict, sort_order integer not null default 0,
  primary key(event_id, sponsor_id)
);
create index event_partners_sponsor_idx on public.event_partners(sponsor_id);
create table public.event_managers (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, primary key(event_id, user_id)
);
create index event_managers_user_idx on public.event_managers(user_id);
create table public.slug_redirects (
  old_slug text primary key, event_id uuid not null references public.events(id) on delete cascade
);
create index slug_redirects_event_idx on public.slug_redirects(event_id);

create function public.is_event_manager_of(p_event uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_admin_role() = 'event_manager', false) and exists (
    select 1 from public.event_managers where event_id = p_event and user_id = (select auth.uid())
  )
$$;
grant execute on function public.is_event_manager_of(uuid) to anon, authenticated;

-- Public tables contain only non-private data. Events are listed only after their publish date.
alter table public.event_types enable row level security;
alter table public.event_topics enable row level security;
alter table public.sponsor_tiers enable row level security;
alter table public.sponsors enable row level security;
alter table public.partner_packages enable row level security;
alter table public.events enable row level security;
alter table public.event_topic_links enable row level security;
alter table public.event_gallery enable row level security;
alter table public.event_partners enable row level security;
alter table public.event_managers enable row level security;
alter table public.slug_redirects enable row level security;

do $$
declare t text;
begin
  foreach t in array array['event_types','event_topics','sponsor_tiers','partner_packages'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select using (true)', t || ': public read', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t || ': staff write', t);
  end loop;
end $$;
create trigger sponsors_touch before update on public.sponsors for each row execute function public.touch_updated_at();
grant select on public.sponsors to anon, authenticated;
grant insert, update, delete on public.sponsors to authenticated;
create policy "sponsors: public current and past" on public.sponsors for select using (
  is_active and (active_from is null or active_from <= (now() at time zone 'Europe/Skopje')::date)
);
create policy "sponsors: staff access" on public.sponsors for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "sponsors: assigned event" on public.sponsors for select to authenticated using (
  exists (select 1 from public.event_partners p where p.sponsor_id = id and public.is_event_manager_of(p.event_id))
);
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
create trigger event_gallery_touch before update on public.event_gallery for each row execute function public.touch_updated_at();
grant select on public.events, public.event_topic_links, public.event_gallery, public.event_partners to anon, authenticated;
grant select on public.event_managers to authenticated;
create policy "events: public listed" on public.events for select using (status = 'published' and (publish_at is null or publish_at <= now()));
create policy "events: staff and managers read" on public.events for select to authenticated using (public.is_staff() or public.is_event_manager_of(id));
create policy "event managers: staff or assigned read" on public.event_managers for select to authenticated using (public.is_staff() or public.is_event_manager_of(event_id));
create policy "topics: visible event" on public.event_topic_links for select using (exists (select 1 from public.events e where e.id = event_id));
create policy "gallery: visible event" on public.event_gallery for select using (exists (select 1 from public.events e where e.id = event_id));
create policy "partners: visible event" on public.event_partners for select using (exists (select 1 from public.events e where e.id = event_id));

-- Details are returned only for an exact current or former slug. Hidden rows are never listable.
create function public.event_by_slug(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select (to_jsonb(e) - 'updated_by' - 'is_sample') || jsonb_build_object(
    'topics', coalesce((select jsonb_agg(l.topic_id) from public.event_topic_links l where l.event_id = e.id), '[]'::jsonb),
    'gallery', coalesce((select jsonb_agg(jsonb_build_object('media_id', g.media_id, 'alt', g.alt, 'credit', g.credit) order by g.sort_order) from public.event_gallery g where g.event_id = e.id), '[]'::jsonb),
    'partners', coalesce((select jsonb_agg(p.sponsor_id order by p.sort_order) from public.event_partners p where p.event_id = e.id), '[]'::jsonb)
  )
  from public.events e
  where (e.slug = p_slug or exists (select 1 from public.slug_redirects r where r.old_slug = p_slug and r.event_id = e.id))
    and e.status in ('published', 'hidden') and (e.publish_at is null or e.publish_at <= now())
  limit 1
$$;
grant execute on function public.event_by_slug(text) to anon, authenticated;

-- The slug namespace is shared by current and previous addresses.
create function public.event_save(p_id uuid, p_data jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  current_event public.events;
  proposed public.events;
  v_event_id uuid := coalesce(p_id, gen_random_uuid());
  slug_owner uuid;
begin
  if p_id is null then
    perform public.require_staff();
  else
    select * into current_event from public.events where id = p_id for update;
    if not found then return null; end if;
    if not public.is_staff() and not coalesce(public.is_event_manager_of(p_id), false) then
      raise exception 'Not allowed' using errcode = '42501';
    end if;
  end if;
  -- One lock covers both tables even if two saves race to claim the same address.
  perform pg_advisory_xact_lock(hashtextextended('eestec:event-slugs', 0));
  proposed := jsonb_populate_record(current_event, p_data);
  select id into slug_owner from public.events where slug = proposed.slug and id <> v_event_id;
  if slug_owner is not null then raise exception 'Slug is already in use' using errcode = '23505'; end if;
  select r.event_id into slug_owner from public.slug_redirects r where r.old_slug = proposed.slug and r.event_id <> v_event_id;
  if slug_owner is not null then raise exception 'Slug is already in use' using errcode = '23505'; end if;
  delete from public.slug_redirects where old_slug = proposed.slug and event_id = v_event_id;
  if p_id is null then
    insert into public.events (id, slug, title, short_description, scope, type_id, starts_at, ends_at, all_day,
      location, city, country, organizer, description, agenda, requirements, fee, contact_email, participant_count, country_count,
      cover_media_id, cover_alt, cover_credit, info_pack_id, video_url, status, publish_at, next_up, applications_enabled,
      apply_via, external_url, opens_at, deadline, results_on, max_participants, waitlist, admission, seo_title, seo_description, seo_share_media_id, updated_by)
    values (v_event_id, proposed.slug, proposed.title, proposed.short_description, proposed.scope, proposed.type_id, proposed.starts_at, proposed.ends_at,
      coalesce(proposed.all_day,false), proposed.location, proposed.city, proposed.country, proposed.organizer, proposed.description,
      coalesce(proposed.agenda,'[]'), proposed.requirements, coalesce(proposed.fee,'{}'), coalesce(proposed.contact_email,''), proposed.participant_count,
      proposed.country_count, proposed.cover_media_id, proposed.cover_alt, proposed.cover_credit, proposed.info_pack_id, coalesce(proposed.video_url,''),
      coalesce(proposed.status,'draft'), proposed.publish_at, coalesce(proposed.next_up,false), coalesce(proposed.applications_enabled,false),
      coalesce(proposed.apply_via,'form'), coalesce(proposed.external_url,''), proposed.opens_at, proposed.deadline, proposed.results_on,
      proposed.max_participants, coalesce(proposed.waitlist,false), coalesce(proposed.admission,'selection'), proposed.seo_title,
      proposed.seo_description, proposed.seo_share_media_id, (select auth.uid()));
  else
    update public.events set slug = proposed.slug, title = proposed.title, short_description = proposed.short_description,
      scope = proposed.scope, type_id = proposed.type_id, starts_at = proposed.starts_at, ends_at = proposed.ends_at, all_day = proposed.all_day,
      location = proposed.location, city = proposed.city, country = proposed.country, organizer = proposed.organizer,
      description = proposed.description, agenda = proposed.agenda, requirements = proposed.requirements, fee = proposed.fee,
      contact_email = proposed.contact_email, participant_count = proposed.participant_count, country_count = proposed.country_count,
      cover_media_id = proposed.cover_media_id, cover_alt = proposed.cover_alt, cover_credit = proposed.cover_credit,
      info_pack_id = proposed.info_pack_id, video_url = proposed.video_url, status = proposed.status, publish_at = proposed.publish_at,
      next_up = proposed.next_up, applications_enabled = proposed.applications_enabled, apply_via = proposed.apply_via,
      external_url = proposed.external_url, opens_at = proposed.opens_at, deadline = proposed.deadline, results_on = proposed.results_on,
      max_participants = proposed.max_participants, waitlist = proposed.waitlist, admission = proposed.admission,
      seo_title = proposed.seo_title, seo_description = proposed.seo_description, seo_share_media_id = proposed.seo_share_media_id,
      updated_by = (select auth.uid()) where id = v_event_id;
    if current_event.slug <> proposed.slug and current_event.status <> 'draft' then
      insert into public.slug_redirects(old_slug, event_id) values (current_event.slug, v_event_id)
      on conflict (old_slug) do update set event_id = excluded.event_id;
    end if;
  end if;
  if p_data ? 'topic_ids' then
    delete from public.event_topic_links where event_id = v_event_id;
    insert into public.event_topic_links(event_id,topic_id)
      select v_event_id, value::uuid from jsonb_array_elements_text(p_data->'topic_ids');
  end if;
  if p_data ? 'partner_ids' then
    delete from public.event_partners where event_id = v_event_id;
    insert into public.event_partners(event_id,sponsor_id,sort_order)
      select v_event_id, value::uuid, ordinality::integer from jsonb_array_elements_text(p_data->'partner_ids') with ordinality;
  end if;
  if p_data ? 'gallery' then
    delete from public.event_gallery where event_id = v_event_id;
    insert into public.event_gallery(event_id,media_id,alt,credit,sort_order)
      select v_event_id, (value->>'media_id')::uuid, value->>'alt', value->>'credit', ordinality::integer
      from jsonb_array_elements(p_data->'gallery') with ordinality;
  end if;
  if p_data ? 'manager_ids' then
    perform public.require_staff();
    delete from public.event_managers where event_id = v_event_id;
    insert into public.event_managers(event_id,user_id)
      select v_event_id, value::uuid from jsonb_array_elements_text(p_data->'manager_ids');
  end if;
  if exists (select 1 from public.events where id = v_event_id and status <> 'draft') and
     exists (select 1 from public.event_gallery where event_id = v_event_id and nullif(trim(alt),'') is null) then
    raise exception 'Published gallery photos need alt text' using errcode = '23514';
  end if;
  return v_event_id;
end
$$;
grant execute on function public.event_save(uuid, jsonb) to authenticated;

create function public.remove_events(p_ids uuid[]) returns uuid[]
language plpgsql security definer set search_path = '' as $$
declare result uuid[];
begin
  perform public.require_staff();
  with removed as (delete from public.events where id = any(p_ids) returning id)
    select coalesce(array_agg(id), array[]::uuid[]) into result from removed;
  return result;
end $$;
grant execute on function public.remove_events(uuid[]) to authenticated;

create function public.remove_event_type(p_id uuid,p_replacement uuid default null) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_staff();
  if exists (select 1 from public.events where type_id = p_id) then
    if p_replacement is null or p_replacement = p_id or not exists (select 1 from public.event_types where id = p_replacement) then
      raise exception 'A replacement event type is required' using errcode = '22023';
    end if;
    update public.events set type_id = p_replacement where type_id = p_id;
  end if;
  delete from public.event_types where id = p_id;
  return found;
end $$;
grant execute on function public.remove_event_type(uuid,uuid) to authenticated;

create policy "media: referenced by assigned events" on public.media for select to authenticated using (
  bucket in ('public-media', 'documents') and exists (select 1 from public.events e where public.is_event_manager_of(e.id)
    and (media.id in (e.cover_media_id,e.info_pack_id,e.seo_share_media_id)
      or exists (select 1 from public.event_gallery g where g.event_id = e.id and g.media_id = media.id)))
);

create function public.set_event_status(p_ids uuid[], p_status public.event_status) returns uuid[]
language plpgsql security definer set search_path = '' as $$
declare e public.events; result uuid[] := array[]::uuid[];
begin
  if not public.is_staff() and public.current_admin_role() is distinct from 'event_manager' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  for e in select * from public.events where id = any(p_ids) order by id loop
    if not public.is_staff() and not public.is_event_manager_of(e.id) then
      raise exception 'Not allowed' using errcode = '42501';
    end if;
    if e.status <> p_status then
      perform public.event_save(e.id,jsonb_build_object('status',p_status));
      result := array_append(result,e.id);
    end if;
  end loop;
  return result;
end $$;
grant execute on function public.set_event_status(uuid[],public.event_status) to authenticated;

-- Deleting a topic has cross-table effects, so only the RPC may do it.
revoke delete on public.event_topics from authenticated;
create function public.remove_event_topic(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_staff();
  delete from public.event_topics where id = p_id;
  return found;
end $$;
grant execute on function public.remove_event_topic(uuid) to authenticated;

create function public.reorder_event_taxonomy(p_kind text,p_ids uuid[]) returns boolean
language plpgsql security definer set search_path = '' as $$
declare total integer; unique_ids integer; n integer;
begin
  perform public.require_staff();
  if p_ids is null then return false; end if;
  select count(distinct x), count(*) into unique_ids,n from unnest(p_ids) x;
  if n <> unique_ids then return false; end if;
  if p_kind = 'types' then
    lock table public.event_types in share row exclusive mode;
    select count(*) into total from public.event_types;
    if total <> n or (select count(*) from public.event_types where id = any(p_ids)) <> n then return false; end if;
    update public.event_types t set sort_order = o.ordinality from unnest(p_ids) with ordinality o(id,ordinality) where t.id = o.id;
  elsif p_kind = 'topics' then
    lock table public.event_topics in share row exclusive mode;
    select count(*) into total from public.event_topics;
    if total <> n or (select count(*) from public.event_topics where id = any(p_ids)) <> n then return false; end if;
    update public.event_topics t set sort_order = o.ordinality from unnest(p_ids) with ordinality o(id,ordinality) where t.id = o.id;
  else raise exception 'Unknown taxonomy' using errcode = '22023'; end if;
  return true;
end $$;
grant execute on function public.reorder_event_taxonomy(text,uuid[]) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['event_types','event_topics','events','event_gallery','sponsor_tiers','sponsors','partner_packages'] loop
    execute format('create index %I on public.%I (is_sample) where is_sample',t || '_sample_idx',t);
  end loop;
end $$;
