-- M20c: the Media library shows who uploaded each file. Names live in admin_roles (display name) and
-- profiles, which an editor cannot all read, and the Auth e-mail is the last fallback, so a function answers.
-- Staff see every uploader; anyone else only themselves.
create function public.media_uploaders(p_ids uuid[]) returns table(id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select u.id, coalesce(nullif(r.display_name, ''), nullif(p.full_name, ''), u.email::text)
  from auth.users u
    left join public.admin_roles r on r.user_id = u.id
    left join public.profiles p on p.id = u.id
  where u.id = any(p_ids) and (public.is_staff() or u.id = (select auth.uid()))
$$;
grant execute on function public.media_uploaders(uuid[]) to authenticated;
