-- eestec.mk · DRAFT Supabase schema
-- Derived from the design canvas and specs 00–11. A starting point, not a final migration:
-- review names, add indexes as needed, and write full RLS policies per table.
-- Statuses and rules marked "DECIDED" must not change without the board.

create extension if not exists pgcrypto;

-- ───────────── Enums ─────────────
create type profile_visibility as enum ('public', 'members_only');                 -- DECIDED default members_only
create type profile_status     as enum ('pending', 'active', 'alumni', 'inactive', 'rejected', 'hidden');
create type admin_role         as enum ('super_admin', 'editor', 'event_manager');  -- DECIDED (no row = member)
create type content_status     as enum ('draft', 'published', 'hidden');
create type event_category     as enum ('local', 'international');
create type apply_via          as enum ('form', 'external');
create type application_status as enum ('pending', 'accepted', 'rejected', 'waitlist');
create type memory_status      as enum ('draft', 'pending', 'published', 'rejected');  -- DECIDED
create type revision_status    as enum ('pending', 'approved', 'rejected');
create type submission_status  as enum ('new', 'under_review', 'accepted', 'archived'); -- DECIDED (ideas + feedback)
create type membership_app_status as enum ('new', 'contacted', 'accepted', 'rejected');
create type message_status     as enum ('new', 'answered', 'archived');
create type inquiry_status     as enum ('new', 'in_progress', 'done');
create type committee_status   as enum ('LC', 'Observer', 'JLC');

-- ───────────── Media ─────────────
create table media (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,              -- public-media | documents | cvs | submissions
  path text not null,
  mime text, size_bytes int, width int, height int,
  alt_text text, credit text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ───────────── People & access ─────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  photo_media_id uuid references media(id),
  bio text check (char_length(bio) <= 400),
  faculty text, year_of_study text,
  phone text,                                   -- never public
  linkedin_url text, github_url text,
  visibility profile_visibility not null default 'members_only',
  status profile_status not null default 'pending',
  member_since date, active_from date, active_to date,
  alumni_now text, alumni_highlight text,
  data_consent_at timestamptz not null,
  newsletter_opt_in boolean not null default false,
  gallery_name_opt_in boolean not null default false,
  cv_opt_in boolean not null default false,     -- DECIDED opt-in only, separate consent
  cv_consent_at timestamptz,
  cv_path text,                                 -- bucket "cvs", deleted immediately on opt-out
  approved_by uuid references auth.users(id), approved_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role admin_role not null,
  invited_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table teams (id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null, sort_order int default 0);
create table member_teams (
  profile_id uuid references profiles(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  role_in_team text not null default 'member',  -- member | lead | trainer
  primary key (profile_id, team_id)
);
create table badges (id uuid primary key default gen_random_uuid(), name text not null, description text, icon text);
create table member_badges (
  profile_id uuid references profiles(id) on delete cascade,
  badge_id uuid references badges(id) on delete cascade,
  note text, awarded_at date default current_date,
  primary key (profile_id, badge_id)
);

create table board_roles (id uuid primary key default gen_random_uuid(), title text not null, email text, sort_order int default 0); -- also /contact + footer
create table board_mandates (id uuid primary key default gen_random_uuid(), label text not null, starts_on date, ends_on date, is_current boolean default false);
create table board_members (
  id uuid primary key default gen_random_uuid(),
  mandate_id uuid references board_mandates(id) on delete cascade,
  board_role_id uuid references board_roles(id),
  role_title_snapshot text not null,            -- past boards keep the title, never the e-mail
  profile_id uuid references profiles(id) on delete set null,
  sort_order int default 0
);

create table login_attempts (                    -- DECIDED 5 failures → 15-minute pause
  id bigserial primary key, email text, ip_hash text, succeeded boolean, created_at timestamptz default now()
);

-- ───────────── Events & applications ─────────────
create table event_types (id uuid primary key default gen_random_uuid(), name text not null, sort_order int default 0);

create table events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category event_category not null,
  type_id uuid references event_types(id),
  topics text[] default '{}',
  starts_at timestamptz not null, ends_at timestamptz not null, all_day boolean default false,
  location text, city text, country text, organizing_committee text,
  organized_by_lc boolean default false,
  short_description text, description text, agenda text, requirements text, fee_text text,
  cover_media_id uuid references media(id),
  video_url text, info_pdf_media_id uuid references media(id), participant_count int,
  status content_status not null default 'draft',
  publish_at timestamptz,
  next_up boolean default false,                 -- "Next up" on Home
  applications_enabled boolean default false,
  apply_via apply_via default 'form', external_url text,
  applications_open_at timestamptz, application_deadline timestamptz,
  max_participants int,                          -- DECIDED per event (default from settings: 24)
  waitlist_enabled boolean default true,         -- DECIDED per event (default from settings)
  seo_title text, seo_description text,
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
-- Upcoming = ends_at > now(); archive = ends_at <= now(). One table, nothing entered twice.
-- "Deadline soon" = now() >= application_deadline - settings.deadline_soon_hours (72)
-- "Just ended"    = now() <  ends_at + settings.just_ended_days (14)

create table event_managers (user_id uuid references auth.users(id) on delete cascade, event_id uuid references events(id) on delete cascade, primary key (user_id, event_id));
create table event_gallery (event_id uuid references events(id) on delete cascade, media_id uuid references media(id), caption text, sort_order int default 0, primary key (event_id, media_id));
create table application_forms (event_id uuid primary key references events(id) on delete cascade, fields jsonb not null default '[]'); -- [{key,label,type,required,options}]
create table applications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  name text not null, email text not null,
  answers jsonb not null default '{}', cv_path text,
  status application_status not null default 'pending',
  waitlist_position int,
  consent_at timestamptz not null,
  created_at timestamptz default now()
);
create table slug_redirects (from_path text primary key, to_path text not null, status_code int default 301);
-- Also in middleware: /upcoming/[slug] → 301 /events/[slug] once ends_at has passed (DECIDED).

-- ───────────── Memories ─────────────
create table memories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  author_id uuid references profiles(id) on delete set null,
  author_deleted boolean default false,          -- render "A former member" (no name, no photo)
  title text not null,
  event_id uuid references events(id) on delete set null, other_event_name text,
  city text, country text, lat double precision, lng double precision,  -- lat/lng for the later map view
  happened_on date,
  body text,
  cover_media_id uuid references media(id), cover_alt text, cover_credit text,
  status memory_status not null default 'draft',
  rejection_reason text, reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
  published_at timestamptz,
  featured_on_home boolean default false,
  source text default 'editor',                  -- editor | impression
  reads_count int default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table memory_photos (memory_id uuid references memories(id) on delete cascade, media_id uuid references media(id), caption text, alt text, sort_order int default 0, primary key (memory_id, media_id));
create table memory_revisions (                  -- DECIDED edits to a published Memory need re-approval
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references memories(id) on delete cascade,
  data jsonb not null,                           -- title, body, cover, photos
  status revision_status not null default 'pending',
  reason text, submitted_at timestamptz default now(),
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz
);

-- ───────────── Ideas, feedback & inboxes ─────────────
create table idea_types (id uuid primary key default gen_random_uuid(), name text not null, sort_order int default 0);
create table ideas (
  id uuid primary key default gen_random_uuid(),
  type_id uuid references idea_types(id),
  title text not null, description text not null,
  attachment_media_id uuid references media(id),
  name text, email text, consent_at timestamptz,  -- consent only when an e-mail is given
  is_anonymous boolean not null default false,
  profile_id uuid references profiles(id) on delete set null,
  status submission_status not null default 'new',
  owner_id uuid references auth.users(id),
  event_draft_id uuid references events(id),
  created_at timestamptz default now(),
  constraint anonymous_has_no_identity check (not is_anonymous or (name is null and email is null and profile_id is null)) -- DECIDED
);
create table feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete set null, other_event_name text,
  rating smallint check (rating between 1 and 5),
  text text not null,
  name text, email text, consent_at timestamptz,
  profile_id uuid references profiles(id) on delete set null,
  memory_id uuid references memories(id) on delete set null, -- "Turn this into a Memories post"
  status submission_status not null default 'new',
  created_at timestamptz default now()
);
create table feedback_photos (feedback_id uuid references feedback(id) on delete cascade, media_id uuid references media(id), primary key (feedback_id, media_id));

create table membership_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null, phone text,
  faculty text, study_program text, year_of_study text, interests text[], heard_from text,
  consent_at timestamptz not null,
  status membership_app_status not null default 'new',
  created_at timestamptz default now()
);
create table contact_subjects (id uuid primary key default gen_random_uuid(), name text not null, route_email text not null, shortcut_url text, sort_order int default 0);
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null, subject_id uuid references contact_subjects(id),
  message text not null, consent_at timestamptz not null,
  status message_status not null default 'new', read_at timestamptz,
  created_at timestamptz default now()
);
create table partner_inquiries (
  id uuid primary key default gen_random_uuid(),
  company text not null, contact_person text not null, email text not null, phone text,
  interest text not null,   -- sponsorship | workshop | job_fair | other
  message text, consent_at timestamptz not null,
  status inquiry_status not null default 'new',
  created_at timestamptz default now()
);
create table internal_notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null, entity_id uuid not null,   -- idea | feedback | contact_message | partner_inquiry | membership_application | application
  author_id uuid references auth.users(id), body text not null,
  created_at timestamptz default now()
);
create table submission_log (                    -- DECIDED rate limit: 5 per hour on /submit
  id bigserial primary key, form text not null, ip_hash text not null, created_at timestamptz default now()
);
create index on submission_log (form, ip_hash, created_at);

-- ───────────── Sponsors ─────────────
create table sponsor_tiers (id uuid primary key default gen_random_uuid(), name text not null, sort_order int default 0, size_weight numeric default 1);
create table sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null, logo_media_id uuid references media(id), website_url text,
  tier_id uuid references sponsor_tiers(id),
  active_from date, active_to date,             -- past active_to → "Past partners"
  sort_order int default 0, is_active boolean default true
);
create table event_partners (event_id uuid references events(id) on delete cascade, sponsor_id uuid references sponsors(id) on delete cascade, primary key (event_id, sponsor_id));
create table partner_packages (id uuid primary key default gen_random_uuid(), name text not null, price_text text, items jsonb default '[]', highlighted boolean default false, sort_order int default 0);
create table cv_access_log (id bigserial primary key, sponsor_id uuid references sponsors(id), viewer_user_id uuid references auth.users(id), profile_id uuid references profiles(id) on delete cascade, viewed_at timestamptz default now());

-- ───────────── Site content & settings ─────────────
create table site_settings (key text primary key, value jsonb not null, updated_by uuid references auth.users(id), updated_at timestamptz default now());
insert into site_settings (key, value) values
  ('deadline_soon_hours', '72'), ('just_ended_days', '14'),          -- DECIDED, editable
  ('default_max_participants', '24'), ('default_waitlist_enabled', 'true'),
  ('auto_archive_events', 'true'), ('login_lockout', '{"attempts":5,"minutes":15}');
create table page_blocks (id uuid primary key default gen_random_uuid(), page text not null, key text not null, value jsonb not null, is_visible boolean default true, sort_order int default 0, unique (page, key));
create table home_activities (id uuid primary key default gen_random_uuid(), icon text, title text, text text, sort_order int default 0);
create table timeline_milestones (id uuid primary key default gen_random_uuid(), year int, title text, text text, media_id uuid references media(id), sort_order int default 0);
create table home_stats (id uuid primary key default gen_random_uuid(), label text, value text, sort_order int default 0);
create table committees (id uuid primary key default gen_random_uuid(), name text, city text, country text, status committee_status, lat double precision, lng double precision, url text, is_home boolean default false);
create table journey_steps (id uuid primary key default gen_random_uuid(), icon text, title text, short_text text, bullets text[], media_id uuid references media(id), button_label text, button_url text, sort_order int default 0);
create table journey_quotes (id uuid primary key default gen_random_uuid(), text text, author_name text, profile_id uuid references profiles(id), step_id uuid references journey_steps(id));
create table join_benefits (id uuid primary key default gen_random_uuid(), icon text, title text, text text, sort_order int default 0);
create table join_steps (id uuid primary key default gen_random_uuid(), title text, text text, sort_order int default 0);
create table join_rules (id uuid primary key default gen_random_uuid(), title text, body text, sort_order int default 0);
create table faq_items (id uuid primary key default gen_random_uuid(), page text default 'join', question text, answer text, sort_order int default 0);
create table documents (id uuid primary key default gen_random_uuid(), title text, media_id uuid references media(id), sort_order int default 0);
create table social_links (id uuid primary key default gen_random_uuid(), platform text, handle text, url text, sort_order int default 0);
create table seo_pages (path text primary key, title text, description text, share_media_id uuid references media(id));
create table activity_log (id bigserial primary key, actor_id uuid references auth.users(id), action text, entity_type text, entity_id uuid, summary text, created_at timestamptz default now());

-- ───────────── RLS helpers (sketch) ─────────────
create or replace function public.admin_role_of(uid uuid) returns admin_role language sql stable as
  $$ select role from admin_roles where user_id = uid $$;
create or replace function public.is_staff() returns boolean language sql stable as
  $$ select exists (select 1 from admin_roles where user_id = auth.uid() and role in ('super_admin','editor')) $$;
create or replace function public.is_active_member() returns boolean language sql stable as
  $$ select exists (select 1 from profiles where id = auth.uid() and status in ('active','alumni')) $$;

alter table profiles enable row level security;
create policy "profiles: public ones for everyone" on profiles for select
  using (status in ('active','alumni') and (visibility = 'public' or public.is_active_member() or public.is_staff()));
create policy "profiles: own row" on profiles for select using (id = auth.uid());
create policy "profiles: edit own row" on profiles for update using (id = auth.uid());   -- block status/team columns via a trigger or a view
-- Visitors still need name + team for members-only profiles: expose a view `profile_cards` with only those columns.

alter table memories enable row level security;
create policy "memories: published for everyone" on memories for select using (status = 'published');
create policy "memories: author sees own" on memories for select using (author_id = auth.uid());
create policy "memories: author edits drafts and rejected" on memories for update using (author_id = auth.uid() and status in ('draft','rejected'));

alter table applications enable row level security;
create policy "applications: staff" on applications for all using (public.is_staff());
create policy "applications: event managers, own events" on applications for select
  using (exists (select 1 from event_managers m where m.user_id = auth.uid() and m.event_id = applications.event_id));
create policy "applications: applicant sees own" on applications for select using (profile_id = auth.uid());

-- Enable RLS on every other table: public read for published content tables, staff write;
-- inbox tables (ideas, feedback, contact_messages, partner_inquiries, membership_applications) insert-only for anon via an Edge Function
-- that runs the spam check + submission_log rate limit, read/update for staff only.
