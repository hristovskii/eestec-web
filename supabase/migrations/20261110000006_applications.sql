-- M19b: event application state changes are serialized by locking the event.
create type public.application_status as enum ('pending', 'accepted', 'rejected', 'waitlist');
create table public.reference_counters (
  kind text not null, year integer not null, last integer not null default 0,
  primary key (kind, year)
);
alter table public.reference_counters enable row level security;
create function public.next_reference_number(p_kind text, p_year integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.reference_counters(kind, year, last) values (p_kind, p_year, 1)
  on conflict (kind, year) do update set last = public.reference_counters.last + 1
  returning last into n;
  return n;
end $$;

create function public.reference_suffix(p_number integer) returns text
language sql immutable set search_path = '' as $$
  select lpad(p_number::text, greatest(4, length(p_number::text)), '0')
$$;

create table public.application_forms (
  event_id uuid primary key references public.events(id) on delete cascade,
  intro jsonb not null check (public.is_localized(intro)), fields jsonb not null default '[]',
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger application_forms_touch before update on public.application_forms for each row execute function public.touch_updated_at();
create table public.applications (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  reference text not null unique, name text not null, email text not null, answers jsonb not null default '{}',
  status public.application_status not null, waitlist_position integer check (waitlist_position >= 1),
  locale text not null check (locale in ('mk','en')), consent_at timestamptz not null default now(), read_at timestamptz,
  profile_id uuid references public.profiles(id) on delete set null, is_sample boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((status = 'waitlist') = (waitlist_position is not null))
);
create unique index applications_event_email_key on public.applications(event_id, lower(trim(email)));
create index applications_event_status_idx on public.applications(event_id, status);
create index applications_profile_idx on public.applications(profile_id);
create trigger applications_touch before update on public.applications for each row execute function public.touch_updated_at();
create table public.application_files (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  field_key text not null, path text not null unique, file_name text not null, mime_type text not null, size_bytes integer not null check (size_bytes >= 0),
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index application_files_application_idx on public.application_files(application_id);
create trigger application_files_touch before update on public.application_files for each row execute function public.touch_updated_at();

create function public.verified_email_matches(p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users u where u.id = (select auth.uid()) and u.email_confirmed_at is not null
    and lower(trim(u.email)) = lower(trim(p_email)))
$$;
grant execute on function public.verified_email_matches(text) to authenticated;

alter table public.application_forms enable row level security;
alter table public.applications enable row level security;
alter table public.application_files enable row level security;
grant select on public.application_forms to anon, authenticated;
grant select on public.applications, public.application_files to authenticated;
create policy "forms: event access" on public.application_forms for select using (
  exists (select 1 from public.events e where e.id = event_id)
);
create policy "applications: staff or assigned manager" on public.applications for select to authenticated
  using (public.is_staff() or public.is_event_manager_of(event_id));
create policy "applications: verified owner" on public.applications for select to authenticated using (
  profile_id = (select auth.uid()) or public.verified_email_matches(email)
);
create policy "application files: staff or assigned manager" on public.application_files for select to authenticated using (
  exists (select 1 from public.applications a where a.id = application_id and (public.is_staff() or public.is_event_manager_of(a.event_id)))
);

-- Renumbering occurs only while the associated event row is locked.
create function public.renumber_event_waitlist(p_event uuid) returns void
language sql security definer set search_path = '' as $$
  with ranked as (
    select id, row_number() over (order by waitlist_position, created_at, id)::integer as position
    from public.applications where event_id = p_event and status = 'waitlist'
  ) update public.applications a set waitlist_position = ranked.position from ranked where a.id = ranked.id and a.waitlist_position <> ranked.position
$$;

create function public.submit_application(p_event uuid, p_name text, p_email text, p_answers jsonb, p_locale text, p_consent boolean, p_profile uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  e public.events; taken integer; waiting integer; position integer; app_status public.application_status;
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
  if exists (select 1 from public.applications a where a.event_id = p_event and lower(trim(a.email)) = lower(trim(p_email))) then
    return jsonb_build_object('status','duplicate');
  end if;
  select count(*) filter (where status = 'accepted'), count(*) filter (where status = 'waitlist')
    into taken, waiting from public.applications where event_id = p_event;
  if (e.max_participants is not null and taken >= e.max_participants) or (e.admission = 'first_come' and e.waitlist and waiting > 0) then
    if not e.waitlist then return jsonb_build_object('status','full'); end if;
    app_status := 'waitlist'; position := waiting + 1;
  elsif e.admission = 'first_come' then app_status := 'accepted';
  else app_status := 'pending'; end if;
  select p.id into member_id from public.profiles p join auth.users u on u.id = p.id
    where p.id = p_profile and u.email_confirmed_at is not null and lower(trim(u.email)) = lower(trim(p_email));
  event_year := extract(year from e.starts_at at time zone 'Europe/Skopje');
  prefix := upper(substr(regexp_replace(e.slug, '[^a-z0-9]', '', 'g'), 1, 3));
  ref := prefix || '-' || event_year || '-' || public.reference_suffix(public.next_reference_number('application:' || prefix, event_year));
  insert into public.applications(event_id, reference, name, email, answers, status, waitlist_position, locale, profile_id)
    values (p_event, ref, trim(p_name), trim(p_email), coalesce(p_answers,'{}'), app_status, position, p_locale, member_id)
    returning * into created;
  return jsonb_build_object('status','created','application',to_jsonb(created));
end $$;
grant execute on function public.submit_application(uuid,text,text,jsonb,text,boolean,uuid) to service_role;

create function public.withdraw_application(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare e_id uuid; a public.applications;
begin
  select event_id into e_id from public.applications where id = p_id;
  if e_id is null then return false; end if;
  perform 1 from public.events where id = e_id for update;
  select * into a from public.applications where id = p_id for update;
  if not found then return false; end if;
  if (select auth.uid()) is null then return false; end if;
  if a.profile_id is distinct from (select auth.uid()) and not exists (
    select 1 from auth.users u where u.id = (select auth.uid()) and u.email_confirmed_at is not null and lower(trim(u.email)) = lower(trim(a.email))
  ) then return false; end if;
  delete from public.applications where id = p_id;
  perform public.renumber_event_waitlist(e_id);
  return true;
end $$;
grant execute on function public.withdraw_application(uuid) to authenticated;

create function public.application_files_cleanup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.storage_cleanup_queue(bucket,path,reason) values ('application-files',old.path,'application file removed');
  return old;
end $$;
create trigger application_files_cleanup after delete on public.application_files for each row execute function public.application_files_cleanup();

create function public.save_application_form(p_event uuid, p_intro jsonb, p_fields jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() and not coalesce(public.is_event_manager_of(p_event),false) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_intro is null then
    delete from public.application_forms where event_id = p_event;
  else
    insert into public.application_forms(event_id,intro,fields) values (p_event,p_intro,p_fields)
      on conflict (event_id) do update set intro = excluded.intro, fields = excluded.fields;
  end if;
end $$;
grant execute on function public.save_application_form(uuid,jsonb,jsonb) to authenticated;

create function public.set_application_status(p_event uuid, p_ids uuid[], p_status public.application_status) returns uuid[]
language plpgsql security definer set search_path = '' as $$
declare a public.applications; next_position integer; changed uuid[] := array[]::uuid[];
begin
  if not public.is_staff() and not coalesce(public.is_event_manager_of(p_event),false) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  perform 1 from public.events where id = p_event for update;
  select coalesce(max(waitlist_position),0) into next_position from public.applications where event_id = p_event;
  for a in select * from public.applications where event_id = p_event and id = any(p_ids) and status <> p_status order by created_at, id loop
    if p_status = 'waitlist' then next_position := next_position + 1; end if;
    update public.applications set status = p_status, waitlist_position = case when p_status = 'waitlist' then next_position else null end where id = a.id;
    changed := array_append(changed,a.id);
  end loop;
  perform public.renumber_event_waitlist(p_event);
  return changed;
end $$;
grant execute on function public.set_application_status(uuid,uuid[],public.application_status) to authenticated;

create function public.mark_application_read(p_id uuid, p_read_at timestamptz) returns boolean
language plpgsql security definer set search_path = '' as $$
declare e_id uuid;
begin
  select event_id into e_id from public.applications where id = p_id;
  if e_id is null then return false; end if;
  if not public.is_staff() and not coalesce(public.is_event_manager_of(e_id),false) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.applications set read_at = p_read_at where id = p_id;
  return found;
end $$;
grant execute on function public.mark_application_read(uuid,timestamptz) to authenticated;

-- D23: expose relationships only when the profile and event are visible to the caller.
create function public.profile_events(p_profile uuid) returns table(event_id uuid, event_role text, attended boolean)
language sql stable security definer set search_path = '' as $$
  with allowed_profile as (
    select p.id, case when u.email_confirmed_at is not null then u.email end as email from public.profiles p join auth.users u on u.id = p.id
    where p.id = p_profile and (
      (p.status in ('active','alumni') and (p.visibility = 'public' or public.is_member_audience()))
      or p.id = (select auth.uid()) or public.is_staff()
    )
  )
  select distinct e.id, 'participant'::text, e.ends_at < now()
    from public.events e join public.applications a on a.event_id = e.id
    join allowed_profile p on (a.profile_id = p.id or (p.email is not null and lower(trim(a.email)) = lower(trim(p.email))))
    where a.status = 'accepted' and e.status = 'published' and (e.publish_at is null or e.publish_at <= now())
  union all
  select e.id, 'organizer'::text, false
    from public.events e join public.event_managers m on m.event_id = e.id join allowed_profile p on p.id = m.user_id
    where e.status = 'published' and (e.publish_at is null or e.publish_at <= now())
$$;
grant execute on function public.profile_events(uuid) to anon,authenticated;

create function public.application_availability(p_event_ids uuid[]) returns table(event_id uuid, taken bigint, waiting bigint)
language sql stable security definer set search_path = '' as $$
  select e.id, count(a.id) filter (where a.status = 'accepted'), count(a.id) filter (where a.status = 'waitlist')
  from public.events e left join public.applications a on a.event_id = e.id
  where e.id = any(p_event_ids) and (e.status = 'published' and (e.publish_at is null or e.publish_at <= now())
    or public.is_staff() or public.is_event_manager_of(e.id)) group by e.id
$$;
grant execute on function public.application_availability(uuid[]) to anon,authenticated;

do $$
declare t text;
begin
  foreach t in array array['application_forms','applications','application_files'] loop
    execute format('create index %I on public.%I (is_sample) where is_sample',t || '_sample_idx',t);
  end loop;
end $$;

-- Hidden events cannot be listed, but their public form and availability still work by exact address.
create function public.application_form_by_slug(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'event_id', e.id,
    'intro', f.intro,
    'fields', f.fields,
    'taken', (select count(*) from public.applications a where a.event_id = e.id and a.status = 'accepted'),
    'waiting', (select count(*) from public.applications a where a.event_id = e.id and a.status = 'waitlist')
  ) from public.events e left join public.application_forms f on f.event_id = e.id
  where (e.slug = p_slug or exists (select 1 from public.slug_redirects r where r.old_slug = p_slug and r.event_id = e.id))
    and e.status in ('published','hidden') and (e.publish_at is null or e.publish_at <= now())
    and e.applications_enabled and e.apply_via = 'form'
  limit 1
$$;
grant execute on function public.application_form_by_slug(text) to anon,authenticated;
