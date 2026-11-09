-- PostgreSQL's global PUBLIC function default cannot be removed by a schema-only revoke.
-- Repair the M19a defaults and existing functions without editing applied migrations.
alter default privileges revoke execute on functions from public;
revoke execute on all functions in schema public from public;

-- M19b: editable site content. Notification settings are not public content.
create table public.page_content (
  page text primary key check (page in ('home', 'journey', 'join', 'partners', 'contact')),
  content jsonb not null check (page <> 'contact' or not (content ? 'subjects')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger page_content_touch before update on public.page_content for each row execute function public.touch_updated_at();
alter table public.page_content enable row level security;
grant select on public.page_content to anon, authenticated;
grant insert, update, delete on public.page_content to authenticated;
create policy "page content: public read" on public.page_content for select using (true);
create policy "page content: staff write" on public.page_content for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger site_settings_touch before update on public.site_settings for each row execute function public.touch_updated_at();
alter table public.site_settings enable row level security;
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
create policy "settings: public read" on public.site_settings for select using (
  key in ('events', 'siteName', 'footerTagline', 'contact', 'weeklyMeeting', 'legal', 'branding', 'retentionMonths', 'privacy')
);
create policy "settings: super admin read" on public.site_settings for select to authenticated using (public.is_super_admin());
create policy "settings: super admin write" on public.site_settings for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy "settings: editor privacy" on public.site_settings for update to authenticated
  using (key = 'privacy' and public.is_staff()) with check (key = 'privacy' and public.is_staff());

create table public.seo_pages (
  page text primary key,
  title jsonb not null check (public.is_localized(title)),
  description jsonb not null check (public.is_localized(description)),
  share_media_id uuid references public.media(id) on delete set null,
  share_alt text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index seo_pages_media_idx on public.seo_pages(share_media_id);
create trigger seo_pages_touch before update on public.seo_pages for each row execute function public.touch_updated_at();
alter table public.seo_pages enable row level security;
grant select on public.seo_pages to anon, authenticated;
grant insert, update, delete on public.seo_pages to authenticated;
create policy "seo: public read" on public.seo_pages for select using (true);
create policy "seo: super admin write" on public.seo_pages for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  handle text not null default '',
  url text not null,
  sort_order integer not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger social_links_touch before update on public.social_links for each row execute function public.touch_updated_at();
alter table public.social_links enable row level security;
grant select on public.social_links to anon, authenticated;
grant insert, update, delete on public.social_links to authenticated;
create policy "social links: public read" on public.social_links for select using (true);
create policy "social links: super admin write" on public.social_links for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create type public.committee_status as enum ('lc', 'observer', 'jlc');
create table public.committees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city jsonb not null check (public.is_localized(city)),
  country text not null check (country ~ '^[A-Z]{2}$'),
  status public.committee_status not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  url text not null default '',
  is_home boolean not null default false,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index committees_name_country_key on public.committees (lower(name), country);
create unique index committees_one_home on public.committees (is_home) where is_home;
create trigger committees_touch before update on public.committees for each row execute function public.touch_updated_at();
alter table public.committees enable row level security;
grant select on public.committees to anon, authenticated;
grant insert, delete on public.committees to authenticated;
grant update (name, city, country, status, lat, lng, url, is_sample) on public.committees to authenticated;
create policy "committees: public read" on public.committees for select using (true);
create policy "committees: staff insert" on public.committees for insert to authenticated with check (public.is_staff() and not is_home);
create policy "committees: staff update" on public.committees for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "committees: staff delete" on public.committees for delete to authenticated using (public.is_staff() and not is_home);

-- Serialize changes and require the target to exist before unmarking the old home.
create function public.set_home_committee(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_staff();
  lock table public.committees in share row exclusive mode;
  if not exists (select 1 from public.committees where id = p_id) then return false; end if;
  update public.committees set is_home = false where is_home and id <> p_id;
  update public.committees set is_home = true where id = p_id and not is_home;
  return true;
end
$$;
grant execute on function public.set_home_committee(uuid) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['page_content','site_settings','seo_pages','social_links','committees'] loop
    execute format('create index %I on public.%I (is_sample) where is_sample',t || '_sample_idx',t);
  end loop;
end $$;
