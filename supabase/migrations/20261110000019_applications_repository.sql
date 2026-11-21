-- M20e: what the applications repository needs from SQL beyond M19b.

-- D37 (owner, 2026-11-21): CVs and application files stay under Vercel's ~4.5 MB request limit, so 4 MB.
update storage.buckets set file_size_limit = 4194304 where id in ('cvs', 'application-files');

-- An event's form for the public page. A hidden event is reachable by address, but its form row is not visible to
-- a visitor through the table, so this definer function answers for events a visitor may reach (and for the board
-- and the assigned manager always). null: the event has no form of its own (the default questions apply).
create function public.application_form_for_event(p_event uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('event_id', f.event_id, 'intro', f.intro, 'fields', f.fields)
  from public.application_forms f join public.events e on e.id = f.event_id
  where f.event_id = p_event and (
    (e.status in ('published', 'hidden') and (e.publish_at is null or e.publish_at <= now()))
    or public.is_staff() or public.is_event_manager_of(e.id)
  )
$$;
grant execute on function public.application_form_for_event(uuid) to anon, authenticated;

-- Totals, new and per status for the board's overview. security invoker: the caller's row-level security decides
-- which applications are counted (staff all, a manager their events), so no separate permission check is needed.
create function public.application_summaries(p_event_ids uuid[]) returns table(
  event_id uuid, total bigint, new_count bigint, pending bigint, accepted bigint, rejected bigint, waitlist bigint)
language sql stable security invoker set search_path = '' as $$
  select a.event_id, count(*), count(*) filter (where a.read_at is null),
    count(*) filter (where a.status = 'pending'), count(*) filter (where a.status = 'accepted'),
    count(*) filter (where a.status = 'rejected'), count(*) filter (where a.status = 'waitlist')
  from public.applications a where a.event_id = any(p_event_ids) group by a.event_id
$$;
grant execute on function public.application_summaries(uuid[]) to authenticated;

-- How many applications answered each question of an event (the form builder warns before removing a question).
create function public.application_answer_counts(p_event uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_object_agg(k, c), '{}'::jsonb) from (
    select kv.key as k, count(*) as c
    from public.applications a, lateral jsonb_each(a.answers) kv
    where a.event_id = p_event and kv.value not in ('""'::jsonb, 'false'::jsonb)
    group by kv.key
  ) counted
$$;
grant execute on function public.application_answer_counts(uuid) to authenticated;

-- Account deletion by e-mail (service role, called after the member's identity is verified): lock the affected
-- events, delete, and close the gaps in their waitlists (D24). Uploaded files are queued for removal by the
-- application_files trigger. Returns how many applications went.
create function public.delete_applications_by_email(p_email text) returns integer
language plpgsql security definer set search_path = '' as $$
declare affected uuid[]; removed integer; e uuid;
begin
  select coalesce(array_agg(distinct a.event_id order by a.event_id), array[]::uuid[]) into affected
    from public.applications a where lower(trim(a.email)) = lower(trim(p_email));
  perform 1 from public.events where id = any(affected) order by id for update;
  with gone as (delete from public.applications a where lower(trim(a.email)) = lower(trim(p_email)) returning 1)
    select count(*)::integer into removed from gone;
  foreach e in array affected loop perform public.renumber_event_waitlist(e); end loop;
  return removed;
end $$;
grant execute on function public.delete_applications_by_email(text) to service_role;
