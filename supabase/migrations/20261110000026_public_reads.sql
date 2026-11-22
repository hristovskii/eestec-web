-- M21: what public pages need that a visitor may not read directly.

-- "Ideas that became events" on /submit: the events of accepted ideas, newest idea first. Only the event ids leave
-- the table (the page then shows the events that are published, through the events repository); nothing about the idea or
-- its sender does.
create function public.accepted_idea_events(p_limit integer default 50) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(x.event_draft_id order by x.created_at desc, x.id desc), '{}'::uuid[])
  from (
    select i.id, i.created_at, i.event_draft_id from public.ideas i
    where i.status = 'accepted' and i.event_draft_id is not null
    order by i.created_at desc, i.id desc
    limit greatest(1, least(coalesce(p_limit, 50), 200))
  ) x
$$;
grant execute on function public.accepted_idea_events(integer) to anon, authenticated;
