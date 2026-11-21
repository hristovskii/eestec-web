-- M20d: what the events repositories need from SQL beyond M19b.

-- Who saved each event last, in one call for a list. The editor id column is not readable by the public roles
-- (0014), so staff and the assigned manager ask here; the Auth e-mail is the last fallback for a name.
create function public.events_updated_by(p_ids uuid[]) returns table(event_id uuid, user_id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select e.id, e.updated_by, coalesce(nullif(r.display_name, ''), nullif(p.full_name, ''), u.email::text)
  from public.events e
    join auth.users u on u.id = e.updated_by
    left join public.admin_roles r on r.user_id = u.id
    left join public.profiles p on p.id = u.id
  where e.id = any(p_ids) and (public.is_staff() or public.is_event_manager_of(e.id))
$$;
grant execute on function public.events_updated_by(uuid[]) to authenticated;

-- Events that already have applications are not deleted (owner decision 2026-11-21): the board hides or archives
-- them instead, so applicants' data is never lost by a click. The ids that were removed are returned.
create or replace function public.remove_events(p_ids uuid[]) returns uuid[]
language plpgsql security definer set search_path = '' as $$
declare result uuid[];
begin
  perform public.require_staff();
  with removed as (
    delete from public.events e where e.id = any(p_ids)
      and not exists (select 1 from public.applications a where a.event_id = e.id)
    returning e.id
  ) select coalesce(array_agg(id), array[]::uuid[]) into result from removed;
  return result;
end $$;
