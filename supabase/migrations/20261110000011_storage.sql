-- M19c/d: private member/submission buckets; public site media and PDF documents.
-- Bucket MIME checks are client-declared and do not replace server-side magic-byte checks (M20).
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('public-media','public-media',true,5000000,array['image/jpeg','image/png','image/webp','image/gif']),
 ('documents','documents',true,10000000,array['application/pdf']),
 ('avatars','avatars',false,5000000,array['image/jpeg','image/png','image/webp']),
 ('memory-photos','memory-photos',false,15000000,array['image/jpeg','image/png','image/webp']),
 ('cvs','cvs',false,5000000,array['application/pdf']),
 ('submissions','submissions',false,4194304,array['application/pdf','image/jpeg','image/png']),
 ('application-files','application-files',false,5000000,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public = excluded.public,file_size_limit = excluded.file_size_limit,allowed_mime_types = excluded.allowed_mime_types;

-- Server-only access for private buckets. M20 delivers private images through a per-request authorization endpoint;
-- the service role may stage files, never hand out a direct signed read URL for a revocable photo.
create policy "site media: staff read metadata" on storage.objects for select to authenticated
  using(bucket_id in ('public-media','documents') and public.is_staff());
create policy "site media: managers read own metadata" on storage.objects for select to authenticated
  using(bucket_id in ('public-media','documents') and public.current_admin_role() = 'event_manager' and owner_id = (select auth.uid())::text);
create policy "site media: staff and managers upload to own folder" on storage.objects for insert to authenticated
  with check(bucket_id in ('public-media','documents') and
    (public.is_staff() or public.current_admin_role() = 'event_manager') and
    (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "site media: staff delete" on storage.objects for delete to authenticated
  using(bucket_id in ('public-media','documents') and public.is_staff());
create policy "site media: managers delete own" on storage.objects for delete to authenticated
  using(bucket_id in ('public-media','documents') and public.current_admin_role() = 'event_manager' and owner_id = (select auth.uid())::text);
create policy "site media: staff update" on storage.objects for update to authenticated
  using(bucket_id in ('public-media','documents') and public.is_staff())
  with check(bucket_id in ('public-media','documents') and public.is_staff());
create policy "site media: managers update own" on storage.objects for update to authenticated
  using(bucket_id in ('public-media','documents') and public.current_admin_role() = 'event_manager' and owner_id = (select auth.uid())::text)
  with check(bucket_id in ('public-media','documents') and public.current_admin_role() = 'event_manager' and owner_id = (select auth.uid())::text and
    (storage.foldername(name))[1] = (select auth.uid())::text);

-- Extend the M19b dashboard without duplicating its event/inbox calculations.
alter function public.dashboard_counts() rename to dashboard_counts_m19b;
revoke execute on function public.dashboard_counts_m19b() from anon,authenticated,public;
create function public.dashboard_counts() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare base jsonb; staff boolean := public.is_staff();
begin
  base := public.dashboard_counts_m19b();
  return base || jsonb_build_object(
    'memoriesToApprove',jsonb_build_object(
      'count',case when staff then (select count(*) from public.memory_queue) else 0 end,
      'oldestAt',case when staff then (select min(submitted_at) from public.memory_queue) else null end),
    'ideas',jsonb_build_object(
      'newIdeas',case when staff then (select count(*) from public.ideas where status = 'new') else 0 end,
      'newFeedback',case when staff then (select count(*) from public.feedback where status = 'new') else 0 end)
  );
end $$;
grant execute on function public.dashboard_counts() to authenticated;

-- Authorized delivery of revocable images (M20 serves them through a route that calls these first). The path is the
-- Storage object name; the answer follows the same rules as the pages that show the photo.
create function public.can_read_memory_photo(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not public.account_deletion_pending((select auth.uid())) and exists (
    select 1 from public.media m where m.bucket = 'memory-photos' and m.path = p_path and m.status = 'ready' and (
      public.is_staff()
      or m.uploaded_by = (select auth.uid())
      or exists (select 1 from public.memories x where x.status = 'published' and (x.cover_media_id = m.id
        or exists (select 1 from public.memory_photos p where p.memory_id = x.id and p.media_id = m.id)))
      or exists (select 1 from public.memories x where x.author_id = (select auth.uid()) and m.id = any(public.memory_media_ids(x.id)))
    )
  )
$$;
grant execute on function public.can_read_memory_photo(text) to anon, authenticated;

-- An avatar is shown where its profile is: public profiles to everyone, members-only ones to members, board seats to
-- everyone; a hidden photo (moderation) only to its owner and staff.
create function public.can_read_avatar(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not public.account_deletion_pending((select auth.uid())) and exists (
    select 1 from public.media m where m.bucket = 'avatars' and m.path = p_path and m.status = 'ready' and (
      public.is_staff()
      or m.uploaded_by = (select auth.uid())
      or exists (select 1 from public.profiles p where p.photo_media_id = m.id and not p.hide_photo and (
        (p.status in ('active', 'alumni') and (p.visibility = 'public' or public.is_member_audience()))
        or exists (select 1 from public.board_members b where b.profile_id = p.id)
      ))
    )
  )
$$;
grant execute on function public.can_read_avatar(text) to anon, authenticated;
