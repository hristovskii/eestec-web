-- M20c: the For Companies page, its packages, the tiers and the sponsor order are saved as units.

-- Sponsors are listed in one board order (the page groups them by tier): a new one goes last overall,
-- as the contract says. (0014 appended per tier; reordering a tier permutes its own slots in this one order.)
create or replace function public.append_sponsor_sort_order() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.sort_order = -1 then
    select coalesce(max(s.sort_order), -1) + 1 into new.sort_order from public.sponsors s;
  end if;
  return new;
end $$;

create function public.uuid_or_null(p_text text) returns uuid
language sql immutable set search_path = '' as $$
  select case when p_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p_text::uuid end
$$;

-- The page text lives in page_content (its package list is stripped there), the packages in partner_packages.
-- At most one package is "Most chosen": the flag is moved in three steps so the unique index never sees two.
create function public.save_partners_page(p_content jsonb, p_packages jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare item jsonb; v_id uuid; ids uuid[] := array[]::uuid[]; n integer := 0; highlighted_id uuid;
begin
  perform public.require_staff();
  if jsonb_typeof(p_content) <> 'object' or jsonb_typeof(p_packages) <> 'array' then
    raise exception 'Invalid partners page' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_array_elements(p_packages) x where coalesce((x->>'highlighted')::boolean, false)) > 1 then
    raise exception 'Only one package can be highlighted' using errcode = '22023';
  end if;
  insert into public.page_content(page, content) values ('partners', p_content)
    on conflict (page) do update set content = excluded.content;
  update public.partner_packages set highlighted = false where highlighted;
  for item in select value from jsonb_array_elements(p_packages) loop
    n := n + 1;
    v_id := coalesce(public.uuid_or_null(item->>'id'), gen_random_uuid());
    insert into public.partner_packages(id, name, text, price_text, items, highlighted, cta, sort_order)
      values (v_id, item->'name', item->'text', item->'price_text', coalesce(item->'items', '[]'::jsonb), false, item->'cta', n)
      on conflict (id) do update set name = excluded.name, text = excluded.text, price_text = excluded.price_text,
        items = excluded.items, cta = excluded.cta, sort_order = excluded.sort_order;
    ids := array_append(ids, v_id);
    if coalesce((item->>'highlighted')::boolean, false) then highlighted_id := v_id; end if;
  end loop;
  delete from public.partner_packages where id <> all(ids);
  if highlighted_id is not null then
    update public.partner_packages set highlighted = true where id = highlighted_id;
  end if;
end $$;
grant execute on function public.save_partners_page(jsonb, jsonb) to authenticated;

-- Tiers: names, sizes and order; a tier that still has sponsors must stay (answered, not raised).
create function public.save_sponsor_tiers(p_tiers jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare item jsonb; v_id uuid; ids uuid[] := array[]::uuid[]; n integer := 0; in_use uuid[];
begin
  perform public.require_staff();
  if jsonb_typeof(p_tiers) <> 'array' then raise exception 'Invalid tiers' using errcode = '22023'; end if;
  for item in select value from jsonb_array_elements(p_tiers) loop
    v_id := public.uuid_or_null(item->>'id');
    if v_id is not null then ids := array_append(ids, v_id); end if;
  end loop;
  lock table public.sponsor_tiers in share row exclusive mode;
  select coalesce(array_agg(distinct s.tier_id), array[]::uuid[]) into in_use
    from public.sponsors s where s.tier_id <> all(ids);
  if cardinality(in_use) > 0 then
    return jsonb_build_object('status', 'in_use', 'tier_ids', to_jsonb(in_use));
  end if;
  ids := array[]::uuid[];
  for item in select value from jsonb_array_elements(p_tiers) loop
    n := n + 1;
    v_id := coalesce(public.uuid_or_null(item->>'id'), gen_random_uuid());
    insert into public.sponsor_tiers(id, name, size, sort_order)
      values (v_id, item->'name', (item->>'size')::public.sponsor_tier_size, n)
      on conflict (id) do update set name = excluded.name, size = excluded.size, sort_order = excluded.sort_order;
    ids := array_append(ids, v_id);
  end loop;
  delete from public.sponsor_tiers where id <> all(ids);
  return jsonb_build_object('status', 'ok');
end $$;
grant execute on function public.save_sponsor_tiers(jsonb) to authenticated;

-- The sponsors of one tier take this order and keep the slots they had in the overall list.
-- The ids must be exactly that tier's sponsors.
create function public.reorder_sponsors(p_tier uuid, p_ids uuid[]) returns boolean
language plpgsql security definer set search_path = '' as $$
declare slots integer[]; total integer;
begin
  perform public.require_staff();
  lock table public.sponsors in share row exclusive mode;
  select array_agg(sort_order order by sort_order, id), count(*)::integer into slots, total
    from public.sponsors where tier_id = p_tier;
  if p_ids is null or coalesce(cardinality(p_ids), 0) <> total
     or (select count(distinct x) from unnest(p_ids) x) <> total
     or exists (select 1 from unnest(p_ids) x where not exists (select 1 from public.sponsors s where s.id = x and s.tier_id = p_tier)) then
    return false;
  end if;
  update public.sponsors s set sort_order = slots[o.position]
    from unnest(p_ids) with ordinality o(id, position) where s.id = o.id;
  return true;
end $$;
grant execute on function public.reorder_sponsors(uuid, uuid[]) to authenticated;
