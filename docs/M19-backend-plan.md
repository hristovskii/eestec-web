# M19: Supabase schema, the plan and the research behind it

Approved by the owner 2026-11-09. **M19a is built** (PR #58). M19b, M19c, M19d remain. This file is the working plan; update it when
something changes, and put what you learn in `docs/ARCHITECTURE.md` "Notes from building (M19x)". SQL conventions: `supabase/AGENTS.md`.

## 1. Goal and boundaries

M19 (ARCHITECTURE §8): a reviewed schema, migrations, RLS on every table with policy tests, storage buckets, generated types, and a
`seed.sql` generated from the fixtures with sample rows flagged and purgeable.
**Not in M19:** Supabase clients and `*.supabase.ts` repositories (M20), Auth configuration/MFA/mailer (M21), Edge Functions, cron,
e-mail sending, CV export UI (M22), content entry and purge run (M23). `DATA_SOURCE` stays `mock`; `pnpm build` must pass with no env.

`handoff/supabase/schema.sql` is the pre-M1 draft. It had RLS on 3 of ~57 tables, helper functions that would recurse inside policies,
policies that leak phone/CV/consent columns, no `is_sample`, plain `text` where the code stores `{mk, en?}`, and none of the fields
added by D1, D6, D22–D30 or the milestones since. Do not copy it; use it as a list of names.

## 2. Decisions taken (owner)

- D23: no `member_events` table. A member's events are derived: Participant = accepted application; Organizer = `event_managers` row.
- D24: withdrawing an application deletes the row (waitlist closes the gap). No "withdrawn" status.
- D25: the board's CV export and `cv_export_log` (who, when, which partner, which profiles) are built in M22.
- D29: `/submit` attachment ≤ 4 MB; feedback photos ≤ 400 KB (1600 px) each, in a private bucket, board only.
- Pages are stored as **one `jsonb` row per page** (`page_content`), validated by the existing zod schemas.
- E-mail links are our own table `auth_links` (24 h confirm, 30 min reset, peek, used = expired) because Supabase has one lifetime.
- Sample people are seeded into `auth.users` (banned, no usable password, flagged, purged), keeping the real FK `profiles.id → auth.users`.
- RLS is tested with **pgTAP** (`supabase/tests/database`).

## 3. Design rules for every migration

1. RLS on every table in `public`; a pgTAP test fails if one has none. No policy = deny.
2. Nothing is granted by default (migration 1 revokes default grants of `anon`/`authenticated`); grant tables and functions explicitly.
3. Role helpers are `security definer`, `set search_path = ''`, schema-qualified, `(select auth.uid())`. A super admin counts only with
   `aal2`. Existing: `current_admin_role`, `is_super_admin`, `is_staff`, `is_active_member`, `is_member_audience`.
   M19b adds `is_event_manager_of(event_id)` (join `admin_roles.role = 'event_manager'` and `event_managers`).
4. Private data by structure, not by policy (RLS is row-level): separate private tables; public reads through `security definer`
   functions; never let anon select a list of members-only rows.
5. Anything with a state machine or cross-table effect is written only through RPCs (`security definer`); anonymous submits never use an
   insert policy.
6. Localized text = `jsonb` `{ "mk": "...", "en"?: "..." }` with `public.is_localized(col)`; alt text/credit are stored per use;
   `alt` null = missing, `''` = decorative.
7. `is_sample boolean not null default false` on every seeded entity table (index where purge scans it).
8. `timestamptz not null default now()`, `updated_at` via `touch_updated_at`; Skopje rules (year, "today", academic year from 1 Sep)
   via `at time zone 'Europe/Skopje'`.
9. Index every foreign key you filter or join by; add the list indexes below.

## 4. Sub-PR plan

### M19a (done, #58)

Tables `media`, `admin_roles`, `profiles`, `member_accounts`, `teams`, `member_teams`, `badges`, `member_badges`, `board_roles`,
`board_mandates`, `board_members`, `auth_links`, `login_lockouts`, `mfa_backup_codes`, `storage_cleanup_queue`; helpers; functions
`members_hidden_count`, `profile_restricted`, `board_view`, `author_cards`, `admin_save_member`, `set_current_mandate`, `reorder_teams`,
`reorder_seats`, `decide_member_registrations`, `login_gate`, `login_record`. Details in ARCHITECTURE "Notes from building (M19a)".

### M19b: site content, events, applications, inboxes

Tables (all with RLS, grants, tests):

- `page_content (page text primary key, content jsonb, is_sample, updated_at)` for `home`, `journey`, `join`, `partners`, `contact`
  (replaces `page_blocks`, `home_*`, `join_*`, `journey_*`, `faq_items`, `documents`). Public select; write staff (`pages` area).
- `site_settings (key text primary key, value jsonb)`: keys `events` (deadlineSoonHours, justEndedDays, defaultMaxParticipants,
  defaultWaitlistEnabled, `auto_close_applications`; D1 drops `auto_archive_events`), `siteName`, `footerTagline`, `contact`,
  `weeklyMeeting`, `legal`, `branding`, `retentionMonths` (12), `notifications` (**private**: recipients), `privacy` (editors may
  write it through `/admin/pages/contact`; the rest is super admin only), `login_lockout` (read-only, or drop: values are constants).
- `seo_pages (page key, title jsonb, description jsonb, share_media_id + alt)`, `social_links`.
- `committees (id, name, city jsonb, country iso2, status lc|observer|jlc, lat, lng, url, is_home)`: partial unique on `is_home`, unique
  `(lower(name), country)`, an RPC that moves the home flag, a trigger refusing to delete the home committee.
- Events: `event_types (name jsonb, sort_order)`, `event_topics (name jsonb, sort_order)` + `event_topic_links`, `events` (localized jsonb:
  title, short_description, description (sanitized HTML), requirements, location, city, country, seo_title, seo_description; `agenda
jsonb`; `fee jsonb {price, note}`; `organizer text` null = LC Skopje; `type_id not null on delete restrict`; `cover_media_id`,
  `cover_alt`, `cover_credit`; `contact_email`; `country_count`; `results_on`; `admission` enum `selection|first_come` (D22);
  `seo_share_media_id`; `info_pack_id`; `video_url`; `participant_count`; `publish_at`; `next_up`; applications settings (via
  form/external, opens, deadline, max participants, waitlist); checks `ends_at >= starts_at`, `max_participants >= 1`, publish rules when
  not draft), `event_gallery (+ alt, credit, sort_order)`, `event_partners (+ sort_order)`, `event_managers`,
  `slug_redirects (old_slug primary key, event_id references events on delete cascade)` (written on slug change of a non-draft event,
  removed when the slug is reused; shared uniqueness check with `events.slug`), sponsors/tiers/packages (see below).
- Sponsors: `sponsor_tiers (name jsonb, size large|medium|small, sort_order; restrict while sponsors use it)`, `sponsors (name, logo +
alt, website_url https, tier_id, active_from, active_to, sort_order)`, `partner_packages (name, text, price_text jsonb, items jsonb,
highlighted exclusive, cta)`. Public sees sponsors active today (Skopje) or past (for the "past partners" list).
- Applications: `application_forms (event_id pk, intro jsonb, fields jsonb)`, `applications (event_id, reference text unique,
email, answers jsonb, status pending|accepted|rejected|waitlist, waitlist_position, locale, read_at, consent_at, profile_id)` with
  `unique (event_id, lower(email))`; `application_files` (several file questions per form; private bucket). Waitlist order by time of
  entering the waitlist (trigger or view renumbers on delete, D24).
- Inboxes: `contact_subjects (name jsonb, route_email, team_label, route_note, shortcut_label, shortcut_url, sort_order)` (route e-mail
  never readable by anon), `contact_messages (reference MSG-YYYY-NNNN, subject text snapshot, routed_to snapshot, subject_id on delete
set null, email nullable for retention, locale, read_at, status)`, `partner_inquiries (reference PRT-YYYY-NNNN, interests text[] (D6),
message, locale, read_at, status)`, `membership_applications (faculty, study_program, year_of_study, interests text[], heard_from,
locale, read_at, status; partial unique on lower(email) where status <> 'rejected')`, `internal_notes (entity_type, entity_id, author,
body ≤ 1000, add-only; types: contact_message, partner_inquiry, membership_application, idea, feedback)`, `activity_log (actor, action,
area, target, href)`, `reference_counters (kind, year, last)`.
- Indexes: `events(status, starts_at, ends_at)`, `applications(event_id, status)`, `event_managers(event_id)`,
  `internal_notes(entity_type, entity_id)`, `activity_log(created_at desc)`, inbox `(status, created_at)` and `read_at`.

RPCs (`security definer`):

- `submit_application`: lock the event row (`for update`); recheck published/hidden, not ended, `via = 'form'`, opening and stop time
  (deadline, or start when none or when auto-close is on); read capacity/waitlist/admission from `events`; reject duplicate e-mail;
  status: Selection → `pending`; First come → `accepted` while places are free and nobody waits, `waitlist` when full or a queue
  exists, otherwise refuse `full` (D11/D22); places taken = `accepted` rows; no automatic promotion (the board accepts the next
  person); assign reference (`AIE-2026-0042` style: 3-letter slug prefix, event start year (Skopje), non-reusing number) and position.
- `submit_contact_message`, `submit_membership` (also checks `join.apply.open`), `submit_partner_inquiry`: reference counters in the same
  transaction; spam guard stays in the Server Action.
- `record_activity(action, area, target, href)` (staff only; triggers only for pure row events: exports, backups, bulk and section
  edits are not row events). `remove_event_type(id, replacement)`, `dashboard_counts()` (one call instead of loading every event).
- `profile_events(profile_id)` derived per D23, published events only; **"Attended" counts accepted applications to events that have
  ended** (assumption).

RLS: public reads of listed events (`published and (publish_at is null or <= now())`; hidden events are reachable by slug, so serve
lists from a view or RPC that returns `published` only), sponsors, pages; event manager: select/update only own events and, for those,
applications, forms, gallery, partners (no create/delete/reassign, D18); editor vs super admin per D18 (Settings and Admin users are
super admin only; Activity log read-only for editors); anon insert only through RPCs; applicant sees/deletes own (match by verified
`auth.jwt() ->> 'email'` or `profile_id`; the code identifies applicants by e-mail today). Media: add a policy so a manager can read
media referenced by their events.

### M19c: member content

- `memories (author_id nullable = former member, slug nullable until first submit and then immutable, reserved slugs `new|edit|preview`,
status draft|pending|published|rejected, source editor|impression, title, body (sanitized HTML), happened_on, place, event_id /
other_event_name, cover_media_id + cover_alt + cover_credit, featured_on_home only while published, rejection_reason, reviewed_by,
submitted_at, published_at, reads_count)`, `memory_photos (own id, memory_id, media_id, caption, alt not null default '', sort_order)`,
  `memory_revisions` (one open revision per memory: partial unique on `memory_id` where status <> 'approved'; consider normalised
  columns + revision photos instead of ids inside jsonb), view `memory_queue` (waiting memories + waiting revisions, oldest first).
  Search index (tsvector/trigram on title, plain body, place) and an expression index on `coalesce(happened_on, published_at,
created_at)`.
- RPCs (the mock's state machine in `memories.mock.ts`): `memory_save_draft` (author; creates/overwrites draft or rejected; pending is
  locked), `memory_submit` (draft/rejected → pending with slug; published → upsert the single pending revision, live stays),
  `memory_decide` (staff; approving a revision copies content and photos to the live row and removes the revision; rejecting keeps
  live and records the reason), `memory_unpublish` (back to draft, clears published_at, featured, revision), `memory_admin_save`
  (never changes status), `retire_memories(uid, delete_published)` (drafts/pending/rejected deleted; published deleted if flagged,
  else author null = "A former member"), `memory_count_read(slug)` (anon, definer).
- Members cannot write `memories` directly (a direct policy could publish their own post); sanitization happens in the Server Action
  and again on render.
- `idea_types (name jsonb, sort_order; restrict)`, `ideas (type_id not null, title, description, attachment media, name/email/user nullable,
anonymous flag + check "anonymous stores no identity, no consent", consent_at, locale, status, owner_id staff only, event_draft_id,
reference)`, `feedback (event_id or other_event_name + event_title snapshot, rating 1–5, impression, is_anonymous + the same check,
locale, status, owner_id, memory_id, consent_at)`, `feedback_photos` (private bucket, board only), RPCs `submit_idea`, `submit_impression`
  (one transaction incl. the Memory and the photo copy; photos copied to the Memory with empty alt), `accept_idea` (hidden draft
  event + status accepted + owner), `event_ratings(from, until, event_ids?)` (academic year Sep–Aug, average rounded to 1 decimal).
- `submission_log (form, device_hash, created_at)` + `rate_limit_hit(form, key)` (advisory lock; 5 per hour; blocked hits are not
  recorded; returns `retryAt` = oldest hit in window + 1 h); purge older than 1 h (D28, overrides the older 30-day note).
- `delete_member_data(uid, also_delete_memories)`: retire memories → delete the member's applications → delete profile/account rows,
  consents, seats, CV and photo rows → return storage paths; the caller removes files and then the Auth user; refuse board accounts
  with an admin role; null name/e-mail/user on the member's ideas and feedback (assumption).
- `cv_export_log (exported_by, sponsor_id, profile_id, exported_at)`: table shape only; the member sees only a yearly count through a
  function (`my_cv_export_count`), never the table.
- RLS: anonymous ideas store no identity; event managers see feedback and ratings of their own events only, read-only, no notes, and
  no ideas; editors/super admin all; authors cannot self-publish.

### M19d: storage, types, seed, purge, wiring

- Buckets: `public-media`, `documents` (public read), `avatars` (public URL, unguessable paths; rows listed to owner/staff),
  `memory-photos` (public once published), `cvs` (private), `submissions` (private), `application-files` (private).
  `storage.objects` policies per bucket; `allowed_mime_types` is client-declared, so keep server-side magic-byte checks; SVG not allowed.
  CVs and application files use the signed two-step upload (decide the detail in M20).
- Generated types at `src/shared/data/supabase/database.types.ts` (ARCHITECTURE §1.5), ignored by ESLint/Prettier or formatted after
  generation; CI regenerates and runs `git diff --exit-code`.
- `scripts/generate-seed.ts` (explicit list of fixtures; **runs under Vitest**: fixtures use extensionless imports and `@/` aliases,
  and scripts run as `node scripts/x.ts`, so no `tsx` needed) → committed `supabase/seed.sql` + a Vitest drift test. Fixtures have no
  `isSample` flag and readable ids (`ev-<slug>`, `u-ana`, `media-logo-red`): map ids to UUIDs with a deterministic v5 over
  `table:id`; fixtures with derived data (applications generated in batches, profiles partly derived from auth registrations,
  `MOCK_MULTIPLY`/`MOCK_NOW`) must be seeded from the base set. Single-record fixtures (home, journey, join, contact, partners,
  settings) become `page_content`/`site_settings` rows. Counts must match (23 events, 35 committees, 20 sponsors, 7 messages…).
  `/brand/*` (real logos, `is_sample = false`) and `/sample/*.svg` use `media.public_path`; file-less placeholder photos use
  `path null` + `sample_caption`.
- `purge_sample_data()` (staff-only) deletes in FK order including sample `auth.users`, with a pgTAP test that seed → purge leaves no
  sample row; remember join rows between a sample parent and a real row (restrict FKs).
- `'supabase'` added to `DATA_SOURCES` (`src/shared/config/data-source.ts`); env vars `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` required only when selected (zod `superRefine` in `env.ts`, `.env.example`); a unit test enumerates every
  repository getter and fails while a feature lacks a Supabase implementation (the visible M20 checklist).
- Docs: "Notes from building (M19b–d)", D31+, `docs/sample-data.md` (flags, purge), mark `handoff/supabase/schema.sql` superseded.

## 5. Cross-cutting findings from the research (keep in mind in M20/M21 too)

1. **Repository scopes vs RLS.** `selectImplementation` has scope `'public'` (anon, cookie-less) and `'session'`. Several repositories
   mix both today: `applicationsRepository()` is hard-wired to `'public'` and also runs admin list/status, member `listByEmail`,
   `withdraw`, `deleteByEmail`; `contactRepository()` defaults to `'public'` and reads `routeEmail` on submit; `settingsRepository()` has
   no scope and serves private recipients via `getRecord()`. Split by scope in M20.
2. **Alt text and credit are per use** (event cover, gallery, sponsor logo, home/journey photos, branding, SEO share image), not per file.
3. **Reference numbers** (`MSG-`, `PRT-`, application refs): mock uses max+1 per Skopje year / `rows.length + 1` (repeats after a
   delete): use counters and unique indexes; store the reference text at insert; D6 wants one on every form submission.
4. **Read/unread is separate from status** (`read_at`) on every inbox table; `locale` is needed for confirmation e-mails.
5. **Skopje time** drives the year filter, references, sponsor "today", academic year, all-day events; archive title sort needs an `mk`
   ICU collation.
6. **Time-based rules have no job**: upcoming/past, `publish_at`, applications opening/closing (D1) and sponsor windows are computed at
   read time, so RLS predicates and RPCs must repeat the time checks. Cron (M22) only does retention, cleanup, revalidation.
7. **Lockout cannot live inside GoTrue**: gate before `signInWithPassword`, record after; the same gate guards change password,
   change e-mail and delete account (use a throw-away client so the session is not rotated). Keyed by e-mail only.
8. **Super admin MFA in RLS** (done in the helper) and Supabase TOTP has no backup codes (`mfa_backup_codes`). D12: no trusted devices.
9. **Profiles leak by column** if one table is readable; hence `member_accounts`. The public board ignores visibility (name and
   photo of seat holders show), which `board_view` handles.
10. **Retention**: D28 says the hashed device key lives one hour (older notes said 30 days: follow D28); D17 says e-mails are blanked
    after `retentionMonths` (default 12), so `contact_messages.email` must be nullable.
11. **Storage cannot be deleted from SQL**: CV opt-out, account deletion, memory delete/unpublish/revision approval enqueue paths in
    `storage_cleanup_queue`; M22 empties it. A failed Storage copy before a DB transaction leaves orphans for the GC job.
12. **Open owner questions** (assumptions in `docs/HANDOFF.md` §5): board seat on account deletion; organizer history; sign-in of
    inactive/hidden/rejected members; feedback sender identity for event managers; "Attended" semantics.

## 6. Verification for every sub-PR

- `pnpm db:reset` applies all migrations (and, from M19d, the seed) cleanly; `pnpm db:lint` clean.
- `pnpm db:test`: RLS on every table; the role matrix (visitor, pending, active, alumni, event manager, editor, super admin without and
  with `aal2`); RPC rules; seed → purge leaves nothing (M19d).
- Generated types and seed regenerate with no diff (M19d).
- `pnpm check` green, `pnpm build` with an empty env green, e2e unchanged (the app is still on mocks); the CI `supabase` job green.
- After M19d: stop, report (what exists, how to check it, assumptions to confirm) and wait for "go" before M20.
