# Handoff: where the project stands and what is left

Written 2026-11-09 so another AI agent (Codex) or a person can continue without the earlier conversation.
Read this first, then `AGENTS.md` (rules), `docs/ARCHITECTURE.md` (decisions D1–D30, milestones §8, notes from building) and
`docs/M19-backend-plan.md` (the backend plan with all research findings).

Keep this file current: when a milestone or sub-PR merges, update "Status", "What is left" and the date at the top.

## 1. Snapshot

- Repo: `hristovskii/eestec-web` (local folder `eestec-lc-skopje`), branch `main`, squash merges only.
- **Done and merged: M0–M18** (Phase 1 and Phase 2 frontend on mock repositories), **M18d** (upload limits, D23–D30 confirmed) and
  **M19a** (Supabase project, identity and people schema, RLS, pgTAP; PR #58, commit `791474a`).
- **CI** runs e2e in four shards since PR #59 (commit `ed9e96e`, about 5 minutes instead of 16). That PR also hardened the
  `admin-home` spec ("hides a section…"): it now waits for the public page and restores the Home layout on failure. Before that fix a
  failed first attempt poisoned its own retry and the Memories-on-Home spec. Check open PRs with `gh pr list`.
- **Next: M19b** (site content, events, applications, inboxes), then M19c, M19d, then M20 → M23.
- The app still runs on mocks (`DATA_SOURCE=mock`). **No app code reads Supabase yet.** M19 only adds the database.
- The owner reviews each finished milestone: stop at the end of a milestone with a report and wait for "go" (see §6).

## 2. Resume in five minutes

```bash
nvm use                      # Node 24 (.nvmrc); pnpm 11
pnpm install
pnpm check                   # typecheck, lint, format, 599 unit tests, i18n keys (must be green)
pnpm dev                     # http://localhost:3000, lab at /design-system

# Backend (needs Docker running)
pnpm db:start                # local Supabase: db, auth, storage only (first run pulls images, several minutes)
pnpm db:reset                # applies supabase/migrations/*.sql
pnpm db:test                 # pgTAP in supabase/tests/database (50 checks at M19a)
pnpm db:lint                 # plpgsql lint, must report no errors
pnpm db:stop
```

- `pnpm build` must pass with **no environment variables**. `pnpm e2e` builds with the e2e flags; CI runs it the same way
  in four shards: `FEATURE_FLAGS=phase2 ENABLE_DEV_SURFACES=true CI=true pnpm e2e --shard=1/4`.
- Env: nothing is required. `.env.example` lists the optional ones. Supabase variables become required only when
  `DATA_SOURCE=supabase` (added in M19d).
- Tooling in place: lefthook (prettier + eslint on commit, commitlint on message, typecheck + unit on push), CI
  (`check`, `e2e` ×4 shards, `supabase` job).

## 3. Milestone status

| #            | Milestone                                                                                             | Status                         | PRs              |
| ------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------- |
| M0           | Foundation (Next 16, tokens, next-intl mk default, tooling, CI)                                       | done                           | commit `b119860` |
| M1           | Design system + `/design-system` lab                                                                  | done                           | #1               |
| M2           | Site chrome (settings, header, footer, sample ribbon)                                                 | done                           | #2               |
| M3a/b        | Admin foundation, admin patterns                                                                      | done                           | #3, #4           |
| M4a/b/c      | Media library, settings, admin users                                                                  | done                           | #5–#7            |
| M5, M6       | Events admin, events public                                                                           | done                           | #8–#10           |
| M7a/b/c      | Upcoming + applications, admin applications, form builder                                             | done                           | #11–#13          |
| M8a/b/c      | Committees map, Home content, public Home                                                             | done                           | #14–#16          |
| M9, M10, M11 | Journey, Join Us, For Companies (+ event partners)                                                    | done                           | #17–#26          |
| M12          | Contact + Inbox + privacy                                                                             | done                           | #27–#31          |
| M13          | Hardening: SEO, JSON-LD, a11y, Lighthouse, MK copy (13b–d were stacked and squashed into #36)         | done                           | #32, #36         |
| M14          | Member auth (log in, register, confirm, approvals)                                                    | done                           | #37–#40          |
| M15          | Members (directory, profile, admin members/teams/badges/board)                                        | done                           | #41–#45          |
| M16          | My profile (visibility, applications, consents + CV, account, delete)                                 | done                           | #46–#49          |
| M17          | Memories (list, post, editor, approvals, admin)                                                       | done                           | #50–#53          |
| M18          | Submit + Ideas; M18d lowered upload limits for Vercel                                                 | done                           | #54–#57          |
| **M19a**     | Supabase setup, identity/people schema, RLS, pgTAP, CI job                                            | **done**                       | #58              |
| M19b         | Site content, events, applications, inboxes (schema + RLS + RPCs + tests)                             | **next**                       | —                |
| M19c         | Memories, ideas/feedback, rate limit, delete-account function                                         | todo                           | —                |
| M19d         | Storage buckets, generated types, seed from fixtures, purge, `DATA_SOURCE=supabase`, docs             | todo                           | —                |
| M20          | `*.supabase.ts` repositories per feature; contract suites green against local Supabase                | todo                           | —                |
| M21          | Supabase Auth, MFA, lockout use, invites, own e-mail links, role claims                               | todo                           | —                |
| M22          | Edge Functions + cron, transactional e-mail, CV export + log, orphan-file cleanup                     | todo                           | —                |
| M23          | Launch: Phase 1 flags in production, board enters content, purge sample data, go live, enable Phase 2 | todo (mostly owner/board work) | —                |

## 4. What M19a delivered (read the code, not just this list)

Files: `supabase/config.toml`, `supabase/migrations/20261110000001_foundation.sql`, `…0002_access.sql`, `…0003_member_functions.sql`,
`supabase/tests/database/{00_rls_everywhere,10_people,11_lockout}.test.sql`, CI job `supabase`, `pnpm db:*` scripts,
"Notes from building (M19a)" in `docs/ARCHITECTURE.md`.

Tables: `media`, `admin_roles`, `profiles`, `member_accounts` (private), `teams`, `member_teams`, `badges`, `member_badges`,
`board_roles`, `board_mandates`, `board_members`, `auth_links`, `login_lockouts`, `mfa_backup_codes`, `storage_cleanup_queue`.
Helpers: `current_admin_role`, `is_super_admin`, `is_staff`, `is_active_member`, `is_member_audience`, `is_localized`, `touch_updated_at`.
Functions: `members_hidden_count`, `profile_restricted`, `board_view`, `author_cards`, `admin_save_member`, `set_current_mandate`,
`reorder_teams`, `reorder_seats`, `decide_member_registrations`, `login_gate`, `login_record` (service role only).

Conventions every later migration must follow are in `supabase/AGENTS.md`. The important ones: RLS on every table, nothing granted
by default, `security definer` + `set search_path = ''` for helpers and RPCs, localized text as `jsonb {mk, en?}`, `is_sample` on
seeded entity tables, writes with a state machine only through RPCs, a pgTAP test per role.

## 5. What is left

### M19b, M19c, M19d (database)

The full plan is `docs/M19-backend-plan.md` (decisions, per-feature mismatches between the draft schema and the code, RPC lists,
RLS rules, storage buckets, seed/purge design). Sub-PR split, one branch each:

- **M19b** site content, events, applications, inboxes: `page_content` (one jsonb row per page), `site_settings`, `seo_pages`,
  `social_links`, `committees`; `event_types`, `event_topics` (+links), `events`, `event_gallery`, `event_partners`,
  `event_managers`, `slug_redirects`, sponsors/tiers/packages; `application_forms`, `applications`, `application_files`;
  `contact_subjects`, `contact_messages`, `partner_inquiries`, `membership_applications`, `internal_notes`, `activity_log`,
  `reference_counters`; RPCs `submit_application`, `submit_contact_message`, `submit_membership`, `submit_partner_inquiry`,
  `record_activity`, `remove_event_type`, `dashboard_counts`, `profile_events` (derived, D23); RLS + pgTAP.
- **M19c** memories (+photos, revisions, queue view and the whole state machine as RPCs), `idea_types`, `ideas`, `feedback`,
  `feedback_photos`, `submit_idea`, `submit_impression`, `accept_idea`, `event_ratings`, `submission_log` + `rate_limit_hit`,
  `delete_member_data`, `cv_export_log` (table shape only); RLS + pgTAP.
- **M19d** buckets and `storage.objects` policies, generated types at `src/shared/data/supabase/database.types.ts`,
  `scripts/generate-seed.ts` (run under Vitest) → `supabase/seed.sql`, `purge_sample_data()`, `'supabase'` in `DATA_SOURCES` with the
  "required only when selected" env rule, the unit test that lists repositories without a Supabase implementation, docs.

### M20 repositories

One `*.supabase.ts` per feature behind the existing interface (`src/features/*/data/*.repository.ts`), registered in each feature's
`data/index.ts` through `selectImplementation`. The existing contract suites (`*.repository.contract.ts`, 20 of 21 repositories;
`auth.repository.ts` has none yet) must run against both mock and local Supabase. Needs the Supabase clients
(`src/shared/data/supabase/`: anon cookie-less for scope `'public'`, cookie client for `'session'`), `proxy.ts` session refresh with
`getClaims()`, and a CI step that exports `API_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY` from `supabase status -o env`.
Open items that land here: the **5 MB CV through a Server Action** (application form and member CV) exceeds Vercel's ~4.5 MB body
limit: move CVs to the two-step signed upload (like the Media library) or lower the limit; every anonymous submit goes through
its RPC, never an anon insert policy; `applications` repository is hard-wired to scope `'public'` today and mixes anonymous, member
and admin calls: split by scope; `settings` repository has no scope and serves private recipients through the public read.

### M21 auth

GoTrue config (min password 10), MFA enrolment for super admins (aal2 is already enforced in RLS helpers), backup codes
(`mfa_backup_codes`), lockout via `login_gate`/`login_record` around `signInWithPassword` and every `verifyPassword` re-check, own
link table `auth_links` (confirm 24 h, reset 30 min, peek without using, used = expired, reset does not sign a board account in),
invites, role claims, "wrong e-mail? change it" via the Admin API, rejected accounts sign out with the reason, D19 production gate
stays until real auth replaces the mock sign-in.

### M22 jobs and e-mail

Edge Functions/cron: revalidate, auto-close, retention (blank e-mails after `retentionMonths`, default 12, D17), delete expired
`auth_links` and `login_lockouts`, `submission_log` older than 1 h (D28), orphan media/file cleanup and `storage_cleanup_queue`,
unconfirmed registrations. Transactional e-mails (15 kinds in the mock mailbox `auth/data/mailbox.ts`, application confirmations,
inbox routing/notifications). **Board CV export for Main-package partners + `cv_export_log`** (D9, D25: who, when, which partner,
which profiles; built here, before launch). CV deletion on opt-out is already queued by a trigger; the job removes the file.

### M23 launch

Phase 1 flags in production, board enters real content, replace everything in `docs/sample-data.md`, run `purge_sample_data()`,
review `docs/i18n-review.md` with a native reviewer, go live, then enable Phase 2 (`FEATURE_FLAGS=phase2`).

### Other open items

- Macedonian strings drafted by the assistant await the owner's review: `docs/i18n-review.md` (about 30 open rows; ти/Вие, борд/одбор).
- Sample content has known flaws the board must fix (invented quotes, the 600 MKD fee, …): `docs/sample-data.md`.
- Vercel plan (Hobby allows one team member; image optimization quotas) is unconfirmed (ARCHITECTURE §9 risks).
- Assumptions made while planning M19 that the owner has **not** confirmed (record as D31+ in ARCHITECTURE §9 when confirmed or changed):
  board seat is removed when its account is deleted; `event_managers` rows stay when a role is removed but policies join
  `admin_roles.role = 'event_manager'`; account deletion nulls name/e-mail/user on that member's ideas and feedback; avatars in a
  public bucket with unguessable paths (rows listed to owner and staff only) and `hide_photo` applied on read; Memory photos public
  once published; `committee_status` lower-case in the database; SVG uploads rejected in the media bucket; "Attended" on a profile
  counts accepted applications to events that have ended; whether event managers see the sender identity of feedback;
  inactive/hidden/rejected members' sign-in behaviour is decided in the app (the database only stores `status`).

## 6. How to work (the owner's rules)

1. **Order and rhythm.** Build in the milestone order of `docs/ARCHITECTURE.md` §8. A milestone is split into small PRs (M19b, M19c…),
   one branch each, conventional commits, opened with `gh`. After the last PR of a milestone: stop, report what changed and how to
   check it, and wait for "go" before the next milestone.
2. **Merging.** The owner's standing instruction: merge your own PRs (squash, delete branch) once CI is green, without asking. Do not
   merge on red CI. Do not enable auto-merge unless asked.
3. **PR hygiene.** Branch from an up-to-date `main`. Do not stack PRs: squash-merging the bottom PR makes every stacked PR conflict
   (learned in M12/M13). Open the next part only after the previous one is merged, or build it locally on a branch cut from the
   previous tip, push without a PR, and `git rebase --onto origin/main <old-tip>` after the merge (before the first push).
4. **Commits.** Conventional commits; the scope is an enum in `commitlint.config.ts` (feature names + `app ui admin-ui layout i18n data
config deps e2e docs ci`; there is no `inbox` or `db` scope: use `data` for database work); subject starts lower case; header ≤ 100
   characters. A milestone commit names it: `feat(data): … (milestone 19b)`.
5. **Before every push** run `pnpm check`, an empty-env `pnpm build`, and for app changes the e2e the way CI does (see §2). For
   database changes: `pnpm db:reset && pnpm db:test && pnpm db:lint`. Run new e2e specs with `--repeat-each=3`.
6. **Docs with every milestone.** Add "Notes from building (Mx)" to `docs/ARCHITECTURE.md`; update `docs/sample-data.md` when sample
   content is added; add a row to `docs/i18n-review.md` for new Macedonian strings; add decisions as D31+ ("not yet confirmed by the
   owner" until they are).
7. **Ask first** before changing a DECIDED rule, a status list, the colour palette, or anything in the D1–D30 table. Never invent
   content: seed with the design sample content and mark it as sample data.
8. **Flaky CI specs seen so far** (re-run the failed job; harden if it is your spec): admin-foundation login redirect, admin-users
   "invite … withdraw" (mobile), admin application form builder, privacy editor clean-up, occasional Google Fonts download failure in
   the build. Every failure in M15/M16 was a loosely written test: no hydration wait after `page.reload()`, two quick actions racing,
   a name that appears twice (scope to an id or role), exact counts in the shared mock store.
9. **Do not poll CI** in a loop; check status when a run is due. A cookie change or `refresh()` inside a Server Action re-renders the
   current page (a redirect then wipes client state).

## 7. Where things are

- Rules and decisions: `AGENTS.md`, `CLAUDE.md` (same rules), `docs/ARCHITECTURE.md` (§8 milestones, §9 decisions, notes per milestone).
- Specs and design: `specs/`, `handoff/` (screens `handoff/screens/*.jpg`, markup `handoff/design-source/*.dc.html`, frames
  `handoff/docs/frames.md`, `rules-and-settings.md`, `routes.md`, `components.md`, `data-model.md`). `handoff/supabase/schema.sql` is the
  superseded pre-M1 draft; the migrations are the source of truth.
- Code: `src/app` (thin routes), `src/features/<name>` (one domain each: components, data repositories + mocks + fixtures +
  contract suites, actions, schemas, types), `src/shared` (design system, layout, lib, config, i18n, data ports). Boundaries are
  enforced by ESLint.
- Database: `supabase/migrations`, `supabase/tests/database`, `supabase/AGENTS.md`, `docs/M19-backend-plan.md`.
- Reports: `docs/reports/lighthouse.md`.
