-- eestec.mk · M19a · foundation: enums, media, profiles, accounts, board, auth helper tables.
-- Source of truth for the schema (handoff/supabase/schema.sql was the pre-M1 draft).
-- Rules for every migration (docs/ARCHITECTURE.md, M19 notes):
--   * RLS on every table in `public`; no policy = no access.
--   * Nothing is granted by default: tables and functions are granted explicitly below.
--   * Localized text is jsonb { "mk": ..., "en": ... } (en optional).
--   * Seeded rows carry is_sample = true so M23 can purge them.

-- ───────────── Nothing is granted unless a migration says so ─────────────
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ───────────── Enums ─────────────
create type public.profile_visibility as enum ('public', 'members_only');   -- DECIDED default members_only
create type public.profile_status     as enum ('pending', 'active', 'alumni', 'inactive', 'rejected', 'hidden');
create type public.admin_role         as enum ('super_admin', 'editor', 'event_manager');  -- DECIDED (no row = member)
create type public.team_role          as enum ('member', 'lead', 'trainer');
create type public.badge_icon         as enum ('calendar-check', 'globe', 'users', 'landmark', 'presentation', 'award', 'star', 'heart');
create type public.media_kind         as enum ('image', 'document');
create type public.media_status       as enum ('pending', 'ready');          -- pending: an upload was reserved, the file has not arrived
create type public.auth_link_kind     as enum ('confirm', 'reset', 'email_change');

-- ───────────── Helpers that need no tables ─────────────
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end
$$;

-- A localized value always has Macedonian text (English falls back to it).
create function public.is_localized(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select value is not null
     and jsonb_typeof(value) = 'object'
     and jsonb_typeof(value -> 'mk') = 'string'
     and (not value ? 'en' or jsonb_typeof(value -> 'en') = 'string')
$$;

-- A cleanup list for files that live in Storage (SQL cannot delete objects): M22 empties it.
create table public.storage_cleanup_queue (
  id bigint generated always as identity primary key,
  bucket text not null,
  path text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ───────────── Media library ─────────────
-- One row per file. Alt text and credit shown on a page are stored where the file is used
-- (cover_alt, gallery alt, …); `alt_text` is the library's own: null = missing, '' = decorative.
create table public.media (
  id uuid primary key default gen_random_uuid(),
  bucket text check (bucket in ('public-media', 'documents', 'avatars', 'memory-photos')),
  path text,                                  -- null: a SAMPLE placeholder or a file shipped with the site
  public_path text,                           -- a file shipped in /public (/brand/…, /sample/…)
  kind public.media_kind not null,
  file_name text not null,
  mime_type text,
  size_bytes integer check (size_bytes >= 0),
  width integer check (width > 0),
  height integer check (height > 0),
  alt_text text,
  credit text,
  sample_caption text,                        -- SAMPLE data: the caption of the placeholder photo
  status public.media_status not null default 'ready',
  uploaded_by uuid references auth.users (id) on delete set null,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_has_a_file_or_placeholder check (path is not null or public_path is not null or sample_caption is not null),
  constraint media_path_needs_bucket check (path is null or bucket is not null)
);
create unique index media_bucket_path_key on public.media (bucket, path) where path is not null;
create index media_uploaded_by_idx on public.media (uploaded_by);
create index media_kind_created_idx on public.media (kind, created_at desc);
create index media_is_sample_idx on public.media (is_sample) where is_sample;
create trigger media_touch before update on public.media for each row execute function public.touch_updated_at();

-- ───────────── Admin roles ─────────────
create table public.admin_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.admin_role not null,
  display_name text,                          -- admins without a member profile (e.g. invited)
  invited_by uuid references auth.users (id) on delete set null,
  invited_at timestamptz,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger admin_roles_touch before update on public.admin_roles for each row execute function public.touch_updated_at();

-- ───────────── Profiles: what the site shows about a person ─────────────
-- A row exists from sign-up (status pending). Private data lives in member_accounts.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  full_name text not null check (char_length(full_name) between 2 and 80),
  photo_media_id uuid references public.media (id) on delete set null,
  hide_photo boolean not null default false,  -- moderation (applied by the repository when reading)
  bio text not null default '' check (char_length(bio) <= 400),
  hide_bio boolean not null default false,
  linkedin_url text not null default '' check (char_length(linkedin_url) <= 200),
  github_url text not null default '' check (char_length(github_url) <= 200),
  visibility public.profile_visibility not null default 'members_only',
  status public.profile_status not null default 'pending',
  member_since date,
  active_to date,
  alumni_now jsonb check (alumni_now is null or public.is_localized(alumni_now)),
  alumni_highlight jsonb check (alumni_highlight is null or public.is_localized(alumni_highlight)),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,28}[a-z0-9]$'),
  constraint profiles_username_not_reserved check (
    username not in ('__none__', 'admin', 'api', 'board', 'edit', 'eestec', 'me', 'members', 'new', 'profile', 'settings')
  )
);
create unique index profiles_username_key on public.profiles (lower(username));
create index profiles_status_idx on public.profiles (status, member_since);
create index profiles_is_sample_idx on public.profiles (is_sample) where is_sample;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- ───────────── Member accounts: private data (owner and staff only) ─────────────
create table public.member_accounts (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  faculty text not null default '' check (char_length(faculty) <= 100),
  year_of_study text check (year_of_study in ('1', '2', '3', '4', 'master', 'phd')),
  phone text not null default '' check (char_length(phone) <= 30),
  data_consent_at timestamptz not null,
  registration_locale text not null default 'mk' check (registration_locale in ('mk', 'en')),
  newsletter_opt_in boolean not null default false,
  gallery_name_opt_in boolean not null default false,
  cv_opt_in boolean not null default false,   -- DECIDED opt-in only, separate consent
  cv_consent_at timestamptz,
  cv_path text,                               -- bucket "cvs"; deleted at once on opt-out (queue below)
  cv_file_name text,
  cv_size integer check (cv_size >= 0),
  cv_uploaded_at timestamptz,
  rejection_reason text,
  decided_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  password_changed_at timestamptz,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_accounts_cv_needs_consent check (cv_path is null or cv_opt_in)
);
create trigger member_accounts_touch before update on public.member_accounts for each row execute function public.touch_updated_at();

-- ───────────── Teams and badges ─────────────
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name jsonb not null check (public.is_localized(name)),
  sort_order integer not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index teams_name_mk_key on public.teams (lower(name ->> 'mk'));
create unique index teams_name_en_key on public.teams (lower(name ->> 'en')) where name ? 'en';
create trigger teams_touch before update on public.teams for each row execute function public.touch_updated_at();

create table public.member_teams (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete restrict,   -- a team with people cannot be deleted
  role public.team_role not null default 'member',
  primary key (profile_id, team_id)
);
create index member_teams_team_idx on public.member_teams (team_id);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null check (public.is_localized(name)),
  description jsonb check (description is null or public.is_localized(description)),
  icon public.badge_icon not null,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index badges_name_mk_key on public.badges (lower(name ->> 'mk'));
create trigger badges_touch before update on public.badges for each row execute function public.touch_updated_at();

create table public.member_badges (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  note text not null default '' check (char_length(note) <= 200),
  awarded_at date not null default current_date,
  primary key (profile_id, badge_id)
);
create index member_badges_badge_idx on public.member_badges (badge_id);

-- ───────────── Board ─────────────
-- Roles are edited in Settings; `key` is the stable address the code uses (e.g. the membership contact).
create table public.board_roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 80),
  email text check (email is null or position('@' in email) > 1),   -- also /contact and the footer
  sort_order integer not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger board_roles_touch before update on public.board_roles for each row execute function public.touch_updated_at();

create table public.board_mandates (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,                 -- "2026/2027"
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint board_mandates_dates check (ends_on >= starts_on)
);
create unique index board_mandates_one_current on public.board_mandates (is_current) where is_current;
create trigger board_mandates_touch before update on public.board_mandates for each row execute function public.touch_updated_at();

create table public.board_members (
  id uuid primary key default gen_random_uuid(),
  mandate_id uuid not null references public.board_mandates (id) on delete cascade,
  board_role_id uuid not null references public.board_roles (id) on delete restrict,
  role_title_snapshot text not null,          -- past boards keep the title as written, never the e-mail
  profile_id uuid not null references public.profiles (id) on delete cascade,   -- deleting an account removes the seat
  sort_order integer not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index board_members_mandate_idx on public.board_members (mandate_id, sort_order);
create index board_members_profile_idx on public.board_members (profile_id);
create index board_members_role_idx on public.board_members (board_role_id);

-- ───────────── Auth: custom e-mail links, lockout, backup codes ─────────────
-- Supabase has one lifetime for every link; the decided rules need 30 min (reset) and 24 h (confirm).
-- Only a hash of the token is stored. Used or expired links stay for a day, then the M22 job removes them.
create table public.auth_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.auth_link_kind not null,
  token_hash text not null unique,
  new_email text,                             -- email_change only
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint auth_links_email_change_has_address check ((kind = 'email_change') = (new_email is not null))
);
create index auth_links_user_idx on public.auth_links (user_id, kind);
create index auth_links_expires_idx on public.auth_links (expires_at);

-- DECIDED: 5 failed sign-ins pause that e-mail address for 15 minutes (unknown addresses too).
create table public.login_lockouts (
  email_key text primary key,                 -- lower(trim(email))
  failures timestamptz[] not null default '{}',
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- Supabase TOTP has no backup codes; the 2-step screen accepts one.
create table public.mfa_backup_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index mfa_backup_codes_user_idx on public.mfa_backup_codes (user_id);
