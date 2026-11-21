-- M19c/d: durable account deletion. Only trusted server code can initiate or advance it.
create table public.cv_export_log (
  id uuid primary key default gen_random_uuid(), exported_by uuid references auth.users(id) on delete set null,
  sponsor_id uuid references public.sponsors(id) on delete set null, sponsor_name text not null,
  profile_id uuid references public.profiles(id) on delete set null, exported_at timestamptz not null default now()
);
create index cv_export_log_profile_idx on public.cv_export_log(profile_id,exported_at);
create index cv_export_log_actor_idx on public.cv_export_log(exported_by);
create index cv_export_log_sponsor_idx on public.cv_export_log(sponsor_id);
alter table public.cv_export_log enable row level security;
grant select on public.cv_export_log to authenticated;
create policy "cv exports: staff read" on public.cv_export_log for select to authenticated using(public.is_staff());
create function public.my_cv_export_count(p_year integer) returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from public.cv_export_log where profile_id = (select auth.uid())
    and extract(year from exported_at at time zone 'Europe/Skopje') = p_year
$$;
grant execute on function public.my_cv_export_count(integer) to authenticated;

-- No FK to auth.users: the durable completion record must survive Auth user deletion.
create table public.account_deletion_jobs (
  user_id uuid primary key, delete_published_memories boolean not null,
  requested_at timestamptz not null default now(), data_cleaned_at timestamptz, completed_at timestamptz
);
create table public.account_deletion_files (
  user_id uuid not null references public.account_deletion_jobs(user_id) on delete cascade,
  bucket text not null, path text not null, preserve boolean not null default false, completed_at timestamptz,
  primary key(user_id,bucket,path)
);
alter table public.account_deletion_jobs enable row level security;
alter table public.account_deletion_files enable row level security;
-- Neither table has grants to the public roles.

create function public.account_deletion_pending(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(p_user = (select auth.uid()),false) and exists(select 1 from public.account_deletion_jobs where user_id = p_user)
$$;
grant execute on function public.account_deletion_pending(uuid) to anon,authenticated;

-- Once deletion starts, existing JWTs must not regain role/member privileges.
create or replace function public.current_admin_role() returns public.admin_role
language sql stable security definer set search_path = '' as $$
  select case when public.account_deletion_pending((select auth.uid())) then null
    when r.role = 'super_admin' and coalesce((select auth.jwt())->>'aal','') <> 'aal2' then null else r.role end
  from public.admin_roles r where r.user_id = (select auth.uid())
$$;
create or replace function public.is_active_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select not public.account_deletion_pending((select auth.uid())) and exists (
    select 1 from public.profiles where id = (select auth.uid()) and status in ('active','alumni')
  )
$$;
create or replace function public.verified_email_matches(p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not public.account_deletion_pending((select auth.uid())) and exists (
    select 1 from auth.users u where u.id = (select auth.uid()) and u.email_confirmed_at is not null
      and lower(trim(u.email)) = lower(trim(p_email))
  )
$$;
-- A stale token cannot continue to read or mutate media it uploaded.
drop policy "media: own uploads are readable" on public.media;
create policy "media: own uploads are readable" on public.media for select to authenticated
  using (uploaded_by = (select auth.uid()) and not public.account_deletion_pending((select auth.uid())));
drop policy "media: event managers add their own" on public.media;
create policy "media: event managers add their own" on public.media for insert to authenticated
  with check (public.current_admin_role() = 'event_manager' and uploaded_by = (select auth.uid()));

create function public.begin_member_deletion(p_user uuid,p_delete_published boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare rec public.memories; paths uuid[]; user_email text; cv_path text; avatar_id uuid; existing public.account_deletion_jobs;
  affected_events uuid[]; affected uuid;
begin
  if p_user is null or p_delete_published is null then raise exception 'Invalid deletion request' using errcode = '22023'; end if;
  select * into existing from public.account_deletion_jobs where user_id = p_user for update;
  if found then return jsonb_build_object('status',case when existing.completed_at is null then 'pending' else 'complete' end); end if;
  select email into user_email from auth.users where id = p_user for update;
  if not found then return jsonb_build_object('status','not_found'); end if;
  select * into existing from public.account_deletion_jobs where user_id = p_user;
  if found then return jsonb_build_object('status',case when existing.completed_at is null then 'pending' else 'complete' end); end if;
  if exists(select 1 from public.admin_roles where user_id = p_user) then
    raise exception 'Remove admin role before deleting account' using errcode = '42501';
  end if;
  insert into public.account_deletion_jobs(user_id,delete_published_memories) values(p_user,p_delete_published);
  select a.cv_path,p.photo_media_id into cv_path,avatar_id from public.profiles p
    left join public.member_accounts a on a.profile_id = p.id where p.id = p_user;
  for rec in select * from public.memories where author_id = p_user for update loop
    paths := public.memory_media_ids(rec.id);
    if rec.status = 'published' and not p_delete_published then
      delete from public.memory_revisions where memory_id = rec.id;
      update public.memories set author_id = null,author_deleted = true where id = rec.id;
    else
      delete from public.memories where id = rec.id;
    end if;
    perform public.memory_queue_unused_media(paths);
  end loop;
  -- Lock the affected events first (the same order as withdrawing), delete the applications, then close the gaps in the waitlists (D24).
  select coalesce(array_agg(distinct a.event_id order by a.event_id),array[]::uuid[]) into affected_events from public.applications a
    where a.profile_id = p_user or (user_email is not null and lower(trim(a.email)) = lower(trim(user_email)));
  perform 1 from public.events where id = any(affected_events) order by id for update;
  delete from public.applications where profile_id = p_user or (user_email is not null and lower(trim(email)) = lower(trim(user_email)));
  foreach affected in array affected_events loop perform public.renumber_event_waitlist(affected); end loop;
  update public.ideas set name = null,email = null,user_id = null,consent_at = null where user_id = p_user;
  update public.feedback set name = null,email = null,user_id = null,consent_at = null where user_id = p_user;
  delete from public.profiles where id = p_user;
  -- CV and avatar paths may have been uploaded by trusted server code, rather than owned by the user.
  if cv_path is not null then
    insert into public.account_deletion_files(user_id,bucket,path) values(p_user,'cvs',cv_path) on conflict do nothing;
  end if;
  insert into public.account_deletion_files(user_id,bucket,path)
    select p_user,m.bucket,m.path from public.media m where m.id = avatar_id and m.bucket = 'avatars' and m.path is not null
      and not exists(select 1 from public.profiles p where p.photo_media_id = m.id)
    on conflict do nothing;
  -- Other owned objects need deletion, or transfer when retained content still references them.
  insert into public.account_deletion_files(user_id,bucket,path,preserve)
    select p_user,o.bucket_id,o.name,
      o.bucket_id in ('public-media','documents') or
      exists(select 1 from public.submission_files f where o.bucket_id = 'submissions' and f.path = o.name) or
      exists(select 1 from public.media m where m.bucket = o.bucket_id and m.path = o.name and (
        exists(select 1 from public.memories x where x.status = 'published' and x.cover_media_id = m.id) or
        exists(select 1 from public.memory_photos x join public.memories mm on mm.id = x.memory_id where x.media_id = m.id and mm.status = 'published')
      ))
    from storage.objects o where o.owner_id = p_user::text or o.owner = p_user
    on conflict(user_id,bucket,path) do update set preserve = excluded.preserve or public.account_deletion_files.preserve;
  -- Storage has no API to change an owner, and a preserved object must outlive the account: detach it here so it
  -- no longer blocks completion. It is done once nothing owned by the user is left to delete.
  update storage.objects o set owner = null, owner_id = null
    where (o.owner_id = p_user::text or o.owner = p_user)
      and exists(select 1 from public.account_deletion_files f where f.user_id = p_user and f.bucket = o.bucket_id and f.path = o.name and f.preserve);
  update public.account_deletion_files set completed_at = now() where user_id = p_user and preserve and completed_at is null;
  update public.account_deletion_jobs set data_cleaned_at = now() where user_id = p_user;
  return jsonb_build_object('status','pending');
end $$;
grant execute on function public.begin_member_deletion(uuid,boolean) to service_role;

-- The worker must use Storage's API, not SQL, and may mark an item done only after the user no longer owns it.
create function public.mark_deletion_file_done(p_user uuid,p_bucket text,p_path text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from storage.objects where bucket_id = p_bucket and name = p_path and (owner_id = p_user::text or owner = p_user)) then
    return false;
  end if;
  if exists(select 1 from public.account_deletion_files where user_id = p_user and bucket = p_bucket and path = p_path and not preserve)
    and exists(select 1 from storage.objects where bucket_id = p_bucket and name = p_path) then return false; end if;
  -- A preserved object can disappear only after all retained references move to its replacement.
  if exists(select 1 from public.account_deletion_files where user_id = p_user and bucket = p_bucket and path = p_path and preserve)
    and not exists(select 1 from storage.objects where bucket_id = p_bucket and name = p_path)
    and (exists(select 1 from public.media where bucket = p_bucket and path = p_path)
      or exists(select 1 from public.submission_files where p_bucket = 'submissions' and path = p_path)) then return false; end if;
  update public.account_deletion_files set completed_at = now() where user_id = p_user and bucket = p_bucket and path = p_path;
  return found;
end $$;
grant execute on function public.mark_deletion_file_done(uuid,text,text) to service_role;

create function public.finish_member_deletion(p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from auth.users where id = p_user) or
     exists(select 1 from storage.objects where owner_id = p_user::text or owner = p_user) or
     exists(select 1 from public.account_deletion_files where user_id = p_user and completed_at is null) then return false; end if;
  update public.account_deletion_jobs set completed_at = coalesce(completed_at,now()) where user_id = p_user and data_cleaned_at is not null;
  return found;
end $$;
grant execute on function public.finish_member_deletion(uuid) to service_role;
