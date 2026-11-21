-- M19c/d: ideas, impressions, and the shared /submit rate limit (D28–D30).
create type public.submission_status as enum ('new','under_review','accepted','archived');

alter table public.page_content drop constraint page_content_page_check;
alter table public.page_content add constraint page_content_page_check check (page in ('home','journey','join','partners','contact','submit'));

create table public.idea_types (
  id uuid primary key default gen_random_uuid(), name jsonb not null check(public.is_localized(name)), sort_order integer not null default 0,
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger idea_types_touch before update on public.idea_types for each row execute function public.touch_updated_at();

create table public.ideas (
  id uuid primary key default gen_random_uuid(), reference text not null unique,
  type_id uuid not null references public.idea_types(id) on delete restrict, title text not null, description text not null,
  name text, email text, user_id uuid references public.profiles(id) on delete set null, is_anonymous boolean not null default false,
  consent_at timestamptz, locale text not null check(locale in ('mk','en')), status public.submission_status not null default 'new',
  owner_id uuid references auth.users(id) on delete set null, owner_name text, event_draft_id uuid references public.events(id) on delete set null,
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (not is_anonymous or (name is null and email is null and user_id is null and consent_at is null))
);
create index ideas_type_idx on public.ideas(type_id);
create index ideas_user_idx on public.ideas(user_id);
create index ideas_owner_idx on public.ideas(owner_id);
create index ideas_event_idx on public.ideas(event_draft_id);
create index ideas_status_idx on public.ideas(status,created_at desc);
create trigger ideas_touch before update on public.ideas for each row execute function public.touch_updated_at();

create table public.feedback (
  id uuid primary key default gen_random_uuid(), reference text not null unique,
  event_id uuid references public.events(id) on delete set null, other_event_name text not null default '', event_title text not null,
  rating integer check (rating between 1 and 5), impression text not null default '',
  name text, email text, user_id uuid references public.profiles(id) on delete set null, is_anonymous boolean not null default false,
  consent_at timestamptz, locale text not null check(locale in ('mk','en')), status public.submission_status not null default 'new',
  owner_id uuid references auth.users(id) on delete set null, owner_name text, memory_id uuid references public.memories(id) on delete set null,
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (not is_anonymous or (name is null and email is null and user_id is null and consent_at is null))
);
create index feedback_event_idx on public.feedback(event_id,created_at desc);
create index feedback_user_idx on public.feedback(user_id);
create index feedback_owner_idx on public.feedback(owner_id);
create index feedback_memory_idx on public.feedback(memory_id);
create index feedback_status_idx on public.feedback(status,created_at desc);
create trigger feedback_touch before update on public.feedback for each row execute function public.touch_updated_at();

-- Private submissions are not media-library objects: they never inherit library read policies.
create table public.submission_files (
  id uuid primary key default gen_random_uuid(), idea_id uuid references public.ideas(id) on delete cascade,
  feedback_id uuid references public.feedback(id) on delete cascade, path text not null unique, file_name text not null,
  mime_type text not null, size_bytes integer not null check(size_bytes >= 0), sort_order integer not null default 0,
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((idea_id is null) <> (feedback_id is null)),
  check ((idea_id is not null and size_bytes <= 4194304 and mime_type in ('application/pdf','image/jpeg','image/png')) or
         (feedback_id is not null and size_bytes <= 409600 and mime_type = 'image/jpeg'))
);
create index submission_files_idea_idx on public.submission_files(idea_id);
create index submission_files_feedback_idx on public.submission_files(feedback_id);
create trigger submission_files_touch before update on public.submission_files for each row execute function public.touch_updated_at();

create table public.submission_log (
  id bigint generated always as identity primary key, device_hash text not null check(device_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
create index submission_log_device_time_idx on public.submission_log(device_hash,created_at);
create index submission_log_created_idx on public.submission_log(created_at);

alter table public.idea_types enable row level security;
alter table public.ideas enable row level security;
alter table public.feedback enable row level security;
alter table public.submission_files enable row level security;
alter table public.submission_log enable row level security;
grant select on public.idea_types to anon,authenticated;
grant insert,update,delete on public.idea_types to authenticated;
grant select on public.ideas,public.feedback,public.submission_files to authenticated;
create policy "idea types: public read" on public.idea_types for select using(true);
create policy "idea types: staff write" on public.idea_types for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy "ideas: staff only" on public.ideas for select to authenticated using(public.is_staff());
create policy "feedback: staff only" on public.feedback for select to authenticated using(public.is_staff());
create policy "submission files: staff only" on public.submission_files for select to authenticated using(public.is_staff());
-- submission_log has no public grant: only the trusted rate-limit function reaches it.

create function public.rate_limit_hit(p_device_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n integer; oldest timestamptz; v_current_time timestamptz := clock_timestamp();
begin
  if p_device_hash is null or p_device_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid device hash' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('eestec:submit:' || p_device_hash,0));
  delete from public.submission_log where created_at <= v_current_time - interval '1 hour';
  select count(*),min(created_at) into n,oldest from public.submission_log where device_hash = p_device_hash and created_at > v_current_time - interval '1 hour';
  if n >= 5 then return jsonb_build_object('allowed',false,'retryAt',oldest + interval '1 hour'); end if;
  insert into public.submission_log(device_hash,created_at) values(p_device_hash,v_current_time);
  return jsonb_build_object('allowed',true,'remaining',4-n);
end $$;
grant execute on function public.rate_limit_hit(text) to service_role;

-- Restricted projection: no name, e-mail, account, consent, memory link, owner, or file metadata.
create function public.event_feedback_for_manager(p_event uuid) returns table (
  id uuid, reference text, event_id uuid, event_title text, rating integer, impression text,
  status public.submission_status, locale text, created_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() and not public.is_event_manager_of(p_event) then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query select f.id,f.reference,f.event_id,f.event_title,f.rating,f.impression,f.status,f.locale,f.created_at
    from public.feedback f where f.event_id = p_event order by f.created_at desc;
end $$;
grant execute on function public.event_feedback_for_manager(uuid) to authenticated;

create function public.submit_idea(p_type uuid,p_title text,p_description text,p_locale text,p_anonymous boolean,
  p_name text,p_email text,p_profile uuid,p_consent boolean,p_attachment jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result public.ideas; ref text; y integer := extract(year from now() at time zone 'Europe/Skopje');
begin
  if p_anonymous is null or p_locale not in ('mk','en') or nullif(trim(p_title),'') is null or nullif(trim(p_description),'') is null then
    raise exception 'Invalid idea' using errcode = '22023';
  end if;
  if not p_anonymous and nullif(trim(p_email),'') is not null and p_consent is not true and p_profile is null then
    raise exception 'Consent required' using errcode = '22023';
  end if;
  if not p_anonymous and p_profile is not null and not exists (select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = p_profile and u.email_confirmed_at is not null and lower(trim(u.email)) = lower(trim(p_email))) then
    raise exception 'Unverified member' using errcode = '42501';
  end if;
  ref := 'IDE-' || y || '-' || public.reference_suffix(public.next_reference_number('idea',y));
  insert into public.ideas(reference,type_id,title,description,locale,is_anonymous,name,email,user_id,consent_at)
    values(ref,p_type,trim(p_title),trim(p_description),p_locale,p_anonymous,
      case when p_anonymous then null else nullif(trim(p_name),'') end,
      case when p_anonymous then null else nullif(trim(p_email),'') end,
      case when p_anonymous then null else p_profile end,
      case when p_anonymous or nullif(trim(p_email),'') is null then null else now() end)
    returning * into result;
  if p_attachment is not null and p_attachment <> 'null'::jsonb then
    insert into public.submission_files(idea_id,path,file_name,mime_type,size_bytes)
      values(result.id,p_attachment->>'path',p_attachment->>'name',p_attachment->>'mime',(p_attachment->>'size')::integer);
  end if;
  return jsonb_build_object('id',result.id,'reference',result.reference);
end $$;
grant execute on function public.submit_idea(uuid,text,text,text,boolean,text,text,uuid,boolean,jsonb) to service_role;

create function public.submit_impression(p_event uuid,p_other_event text,p_event_title text,p_rating integer,p_text text,p_locale text,
  p_anonymous boolean,p_name text,p_email text,p_profile uuid,p_consent boolean,p_files jsonb default '[]',p_memory_content jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result public.feedback; ref text; y integer := extract(year from now() at time zone 'Europe/Skopje');
  f jsonb; file_position integer := 0; mid uuid; member_status public.profile_status;
begin
  if p_anonymous is null or p_locale not in ('mk','en') or p_event_title is null or
    (p_rating is not null and p_rating not between 1 and 5) or jsonb_typeof(p_files) <> 'array' or jsonb_array_length(p_files) > 10 then
    raise exception 'Invalid feedback' using errcode = '22023';
  end if;
  if not p_anonymous and nullif(trim(p_email),'') is not null and p_consent is not true and p_profile is null then
    raise exception 'Consent required' using errcode = '22023';
  end if;
  if not p_anonymous and p_profile is not null then
    select p.status into member_status from public.profiles p join auth.users u on u.id = p.id
      where p.id = p_profile and u.email_confirmed_at is not null and lower(trim(u.email)) = lower(trim(p_email));
    if not found then raise exception 'Unverified member' using errcode = '42501'; end if;
  end if;
  if p_memory_content is not null and p_memory_content <> 'null'::jsonb then
    if p_anonymous or p_profile is null or member_status not in ('active','alumni') then
      raise exception 'Only identified members may create a Memory' using errcode = '42501';
    end if;
    perform public.memory_validate_content(p_memory_content,p_profile,false);
    if nullif(trim(p_memory_content->>'title'),'') is null or nullif(trim(p_memory_content->>'body'),'') is null then
      raise exception 'Memory title and content required' using errcode = '22023';
    end if;
    insert into public.memories(author_id,source,status,slug,submitted_at)
      values(p_profile,'impression','pending',public.memory_new_slug(p_memory_content->>'title'),now()) returning id into mid;
    perform public.memory_apply_content(mid,p_memory_content);
  end if;
  ref := 'FDB-' || y || '-' || public.reference_suffix(public.next_reference_number('feedback',y));
  insert into public.feedback(reference,event_id,other_event_name,event_title,rating,impression,locale,is_anonymous,name,email,user_id,consent_at,memory_id)
    values(ref,p_event,case when p_event is null then coalesce(p_other_event,'') else '' end,p_event_title,p_rating,coalesce(p_text,''),p_locale,p_anonymous,
      case when p_anonymous then null else nullif(trim(p_name),'') end,case when p_anonymous then null else nullif(trim(p_email),'') end,
      case when p_anonymous then null else p_profile end,case when p_anonymous or nullif(trim(p_email),'') is null then null else now() end,mid)
    returning * into result;
  for f in select value from jsonb_array_elements(p_files) loop
    file_position := file_position + 1;
    insert into public.submission_files(feedback_id,path,file_name,mime_type,size_bytes,sort_order)
      values(result.id,f->>'path',f->>'name',f->>'mime',(f->>'size')::integer,file_position);
  end loop;
  return jsonb_build_object('id',result.id,'reference',result.reference,'memoryId',mid);
end $$;
grant execute on function public.submit_impression(uuid,text,text,integer,text,text,boolean,text,text,uuid,boolean,jsonb,jsonb) to service_role;

create function public.update_submission(p_kind text,p_id uuid,p_status public.submission_status,p_owner uuid,p_owner_name text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_staff();
  if p_kind = 'idea' then
    update public.ideas set status = p_status,owner_id = p_owner,owner_name = case when p_owner is null then null else p_owner_name end where id = p_id;
  elsif p_kind = 'feedback' then
    update public.feedback set status = p_status,owner_id = p_owner,owner_name = case when p_owner is null then null else p_owner_name end where id = p_id;
  else raise exception 'Unknown submission kind' using errcode = '22023'; end if;
  return found;
end $$;
grant execute on function public.update_submission(text,uuid,public.submission_status,uuid,text) to authenticated;

create function public.accept_idea(p_id uuid,p_event_data jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rec public.ideas; created uuid; owner_label text;
begin
  perform public.require_staff();
  select * into rec from public.ideas where id = p_id for update;
  if not found then return null; end if;
  if rec.event_draft_id is not null then return rec.event_draft_id; end if;
  select coalesce(nullif(r.display_name,''),nullif(p.full_name,''),u.email) into owner_label
    from auth.users u left join public.admin_roles r on r.user_id = u.id left join public.profiles p on p.id = u.id
    where u.id = (select auth.uid());
  created := public.event_save(null,p_event_data || jsonb_build_object('status','draft'));
  update public.ideas set status = 'accepted',event_draft_id = created,owner_id = (select auth.uid()),owner_name = owner_label where id = p_id;
  return created;
end $$;
grant execute on function public.accept_idea(uuid,jsonb) to authenticated;

-- Ratings per event of the site, and per free-text "other" event (other_key). The caller passes the
-- academic-year window (the app owns that rule). Managers see only their own events; "other" events are staff only.
create function public.event_ratings(p_from timestamptz,p_until timestamptz,p_event_ids uuid[] default null)
returns table(event_id uuid,other_key text,event_title text,average numeric,rating_count bigint,distribution bigint[],
  latest_at timestamptz,latest_comment text,latest_comment_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() and public.current_admin_role() is distinct from 'event_manager' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query select f.event_id,case when f.event_id is null then lower(trim(f.other_event_name)) end,max(f.event_title),
    round(avg(f.rating)::numeric,1),count(*),
    array[count(*) filter(where f.rating = 1),count(*) filter(where f.rating = 2),count(*) filter(where f.rating = 3),
      count(*) filter(where f.rating = 4),count(*) filter(where f.rating = 5)],max(f.created_at),
    (array_agg(f.impression order by f.created_at desc) filter (where nullif(trim(f.impression),'') is not null))[1],
    (array_agg(f.created_at order by f.created_at desc) filter (where nullif(trim(f.impression),'') is not null))[1]
    from public.feedback f where f.rating is not null and (p_from is null or f.created_at >= p_from)
      and (p_until is null or f.created_at < p_until) and (p_event_ids is null or f.event_id = any(p_event_ids))
      and (public.is_staff() or public.is_event_manager_of(f.event_id))
    group by f.event_id,case when f.event_id is null then lower(trim(f.other_event_name)) end;
end $$;
grant execute on function public.event_ratings(timestamptz,timestamptz,uuid[]) to authenticated;

create function public.submission_file_cleanup() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.storage_cleanup_queue(bucket,path,reason) values('submissions',old.path,'submission file removed');
  return old;
end $$;
create trigger submission_file_cleanup after delete on public.submission_files for each row execute function public.submission_file_cleanup();
