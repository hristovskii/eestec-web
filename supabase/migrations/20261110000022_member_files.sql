-- M20g2: the files a member owns: the profile photo (bucket `avatars`) and the CV (bucket `cvs`).
-- The app uploads into the person's own folder, `<user id>/<file id>.<ext>`, with the person's own session; an RPC then
-- registers the file (media row, profile or account row) and queues the one it replaces. Nothing here hands out a signed
-- URL: private photos are delivered by a route that reads Storage as the viewer, and Storage asks `can_read_avatar`.

-- A photo is sent as a cropped 600 px JPEG of at most 2 MB (PHOTO.sendMaxBytes); the bucket now says the same.
update storage.buckets set file_size_limit = 2000000 where id = 'avatars';

-- ───────────── Storage policies ─────────────
-- Avatars: write only into the own folder (not once deletion has started); read what `can_read_avatar` allows (the same
-- rule as the pages that show the photo: a profile's audience, staff) and the own folder (a delete needs to see the row,
-- and the media row of a replaced photo is already gone by then; the person uploaded those files themselves).
create policy "avatars: members add to their own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
    and not public.account_deletion_pending((select auth.uid())));
create policy "avatars: read what the profile allows" on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars' and public.can_read_avatar(name));
create policy "avatars: members read their own folder" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: members delete from their own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- CVs: private to the person. Partners get a CV only through the export job (service role, M22), never from here.
create policy "cvs: members add to their own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text
    and not public.account_deletion_pending((select auth.uid())));
create policy "cvs: members read their own folder" on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "cvs: members delete from their own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ───────────── Photo ─────────────
-- Makes an uploaded file the profile photo. The old file's media row goes and its object is queued for removal (the app
-- also removes it at once and tolerates a failure; the queue is the record). Returns the old path so the caller can do that.
create function public.set_my_photo(p_path text, p_mime text, p_size integer, p_file_name text default 'photo.jpg')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  old_id uuid;
  old_path text;
  new_id uuid;
begin
  if uid is null or public.account_deletion_pending(uid) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = uid and status <> 'rejected') then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_path is null or (storage.foldername(p_path))[1] is distinct from uid::text
     or not exists (select 1 from storage.objects where bucket_id = 'avatars' and name = p_path) then
    raise exception 'The photo is not in your folder' using errcode = '22023';
  end if;

  select m.id, m.path into old_id, old_path
    from public.profiles p join public.media m on m.id = p.photo_media_id
    where p.id = uid and m.bucket = 'avatars' and m.uploaded_by = uid;

  insert into public.media (bucket, path, kind, file_name, mime_type, size_bytes, uploaded_by)
    values ('avatars', p_path, 'image', coalesce(nullif(p_file_name, ''), 'photo.jpg'), p_mime, p_size, uid)
    returning id into new_id;
  update public.profiles set photo_media_id = new_id where id = uid;

  if old_id is not null then
    delete from public.media where id = old_id;
    insert into public.storage_cleanup_queue (bucket, path, reason) values ('avatars', old_path, 'photo replaced');
  end if;
  return jsonb_build_object('status', 'saved', 'path', p_path, 'previous', old_path);
end $$;
grant execute on function public.set_my_photo(text, text, integer, text) to authenticated;

-- Removes the profile photo; returns the path of the file that was removed (null: there was none).
create function public.remove_my_photo() returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  old_id uuid;
  old_path text;
begin
  if uid is null or public.account_deletion_pending(uid) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select m.id, m.path into old_id, old_path
    from public.profiles p join public.media m on m.id = p.photo_media_id
    where p.id = uid and m.bucket = 'avatars' and m.uploaded_by = uid;
  update public.profiles set photo_media_id = null where id = uid;
  if old_id is null then return null; end if;
  delete from public.media where id = old_id;
  insert into public.storage_cleanup_queue (bucket, path, reason) values ('avatars', old_path, 'photo removed');
  return old_path;
end $$;
grant execute on function public.remove_my_photo() to authenticated;

-- ───────────── CV ─────────────
-- Registers an uploaded CV, only while CV sharing is on (DECIDED: opt-in, separate consent). The replaced file is queued.
create function public.set_my_cv(p_path text, p_file_name text, p_size integer, p_now timestamptz default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  opted_in boolean;
  old_path text;
  stamp timestamptz := coalesce(p_now, now());
begin
  if uid is null or public.account_deletion_pending(uid) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select cv_opt_in, cv_path into opted_in, old_path from public.member_accounts where profile_id = uid;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if not opted_in then return jsonb_build_object('status', 'not_opted_in'); end if;
  if p_path is null or (storage.foldername(p_path))[1] is distinct from uid::text
     or not exists (select 1 from storage.objects where bucket_id = 'cvs' and name = p_path) then
    raise exception 'The CV is not in your folder' using errcode = '22023';
  end if;

  update public.member_accounts
    set cv_path = p_path, cv_file_name = p_file_name, cv_size = p_size, cv_uploaded_at = stamp
    where profile_id = uid;
  if old_path is not null and old_path <> p_path then
    insert into public.storage_cleanup_queue (bucket, path, reason) values ('cvs', old_path, 'cv replaced');
  end if;
  return jsonb_build_object('status', 'stored', 'previous', old_path,
    'cv', jsonb_build_object('file_name', p_file_name, 'size', p_size, 'uploaded_at', stamp));
end $$;
grant execute on function public.set_my_cv(text, text, integer, timestamptz) to authenticated;

-- Deletes the CV and leaves sharing on (the upload box comes back); returns the removed path (null: there was none).
create function public.remove_my_cv() returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  old_path text;
begin
  if uid is null or public.account_deletion_pending(uid) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select cv_path into old_path from public.member_accounts where profile_id = uid;
  if old_path is null then return null; end if;
  update public.member_accounts
    set cv_path = null, cv_file_name = null, cv_size = null, cv_uploaded_at = null
    where profile_id = uid;
  insert into public.storage_cleanup_queue (bucket, path, reason) values ('cvs', old_path, 'cv removed');
  return old_path;
end $$;
grant execute on function public.remove_my_cv() to authenticated;
