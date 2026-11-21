-- M20c: Settings are saved as one unit, and shipped/sample media are visible to the public pages.

-- Files shipped with the site (/brand, /sample: no bucket) are not private; without this policy a visitor
-- could not read the media row behind a share image or an event cover that points at one.
create policy "media: shipped and sample files are readable" on public.media for select
  using (status = 'ready' and bucket is null);

-- Admin › Settings touches four tables (site_settings, board_roles, social_links, seo_pages). One call, one
-- transaction, super admin with 2-step only (D18). Board roles keep their ids (seats refer to them): a role
-- that still has seats cannot be removed (the foreign key refuses, 23503).
create function public.save_site_settings(p_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  k text; item jsonb; seo_entry record; v_id uuid; ids uuid[] := array[]::uuid[]; n integer := 0; v_key text;
begin
  if not public.is_super_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if jsonb_typeof(p_data) <> 'object' or jsonb_typeof(p_data->'settings') <> 'object'
     or jsonb_typeof(p_data->'board_roles') <> 'array' or jsonb_typeof(p_data->'social_links') <> 'array'
     or jsonb_typeof(p_data->'seo') <> 'object' then
    raise exception 'Invalid settings' using errcode = '22023';
  end if;
  foreach k in array array['siteName','footerTagline','branding','contact','weeklyMeeting','legal','events','retentionMonths','notifications'] loop
    if not (p_data->'settings' ? k) then raise exception 'Missing setting %', k using errcode = '22023'; end if;
    insert into public.site_settings(key, value) values (k, p_data->'settings'->k)
      on conflict (key) do update set value = excluded.value;
  end loop;

  for item in select value from jsonb_array_elements(p_data->'board_roles') loop
    n := n + 1;
    v_id := case when item->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (item->>'id')::uuid end;
    if v_id is not null and exists (select 1 from public.board_roles where id = v_id) then
      update public.board_roles set title = item->>'title', email = nullif(item->>'email', ''), sort_order = n where id = v_id;
    else
      v_id := coalesce(v_id, gen_random_uuid());
      v_key := trim(both '-' from regexp_replace(lower(coalesce(item->>'title', '')), '[^a-z0-9]+', '-', 'g'));
      v_key := coalesce(nullif(v_key, ''), 'role') || '-' || left(v_id::text, 6);
      insert into public.board_roles(id, key, title, email, sort_order)
        values (v_id, v_key, item->>'title', nullif(item->>'email', ''), n);
    end if;
    ids := array_append(ids, v_id);
  end loop;
  delete from public.board_roles where id <> all(ids);

  delete from public.social_links where true;
  insert into public.social_links(platform, handle, url, sort_order)
    select v.value->>'platform', coalesce(v.value->>'handle', ''), v.value->>'url', v.ordinality::integer
    from jsonb_array_elements(p_data->'social_links') with ordinality v(value, ordinality);

  for seo_entry in select key, value from jsonb_each(p_data->'seo') loop
    insert into public.seo_pages(page, title, description, share_media_id, share_alt)
      values (seo_entry.key, seo_entry.value->'title', seo_entry.value->'description',
        nullif(seo_entry.value->>'share_media_id', '')::uuid, seo_entry.value->>'share_alt')
      on conflict (page) do update set title = excluded.title, description = excluded.description,
        share_media_id = excluded.share_media_id, share_alt = excluded.share_alt;
  end loop;
end $$;
grant execute on function public.save_site_settings(jsonb) to authenticated;
