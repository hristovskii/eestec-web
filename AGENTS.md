# eestec.mk: instructions for AI coding agents (Codex and others)

`CLAUDE.md` carries the same rules for Claude Code. **Keep the two files in sync** when a rule changes.
**Where we are and what is left: `docs/HANDOFF.md` (read it first).**

## What we are building

The website of EESTEC LC Skopje (eestec.mk): a public site, member accounts (Phase 2) and an Admin Panel through which the board edits
**everything**. Nothing on the public site is hard-coded.

## Sources of truth (read before changing anything)

0. `docs/HANDOFF.md`: current status, what is done, what is left, how to work with the owner.
1. `docs/ARCHITECTURE.md`: the approved architecture, folder rules, milestones (§8) and the decisions log (§9, D1–D30), plus
   "Notes from building" for every milestone. It overrides everything below where they differ.
2. `docs/M19-backend-plan.md`: the backend (Supabase) plan with all research findings. `supabase/AGENTS.md`: SQL conventions.
3. `specs/00-overview-and-design-system.md` … `specs/11-admin-panel.md` (the original specs)
4. `handoff/docs/rules-and-settings.md` (decisions made during design; they override the specs where they differ)
5. `handoff/docs/routes.md`, `handoff/docs/components.md`, `handoff/docs/data-model.md`. `handoff/supabase/schema.sql` is the **superseded**
   pre-M1 draft: the migrations in `supabase/migrations/` are the source of truth.
6. `handoff/screens/*.jpg` (what it must look like) and `handoff/design-source/*.dc.html` (exact markup, spacing, copy, states). Find a
   frame in `handoff/docs/frames.md`.

Also read before building: `docs/sample-data.md` (every kind of sample content and who replaces it) and `docs/i18n-review.md`
(Macedonian strings still to be reviewed).

## Stack

- Next.js 16 (App Router, Cache Components, TypeScript strict), React Server Components by default; client components only for
  interactivity. Next 16 differs from older versions: check `node_modules/next/dist/docs/` before using an API (e.g. `proxy.ts`
  replaces middleware, `next/root-params`).
- Frontend first: all data goes through per-feature repository interfaces with mock implementations; Supabase (Postgres + RLS on every
  table, Auth, Storage, Edge Functions + cron) comes last, behind the same interfaces. **The schema is being built (M19); the app
  still runs on mocks.**
- Styling: Tailwind v4 + shadcn/ui, themed only from `handoff/docs/tokens.css` (`src/shared/styles/`). Roboto via `next/font`
  (300/400/500/700, latin + cyrillic).
- i18n with next-intl: **Macedonian is the default** (unprefixed URLs), English under `/en`. UI strings in
  `src/shared/i18n/messages/{mk,en}.json`; drafted MK strings are tracked in `docs/i18n-review.md`. Board content is `{ mk, en? }` with
  EN falling back to MK. The admin UI is English.
- Leaflet + OpenStreetMap for the committee map.
- Node 24 (`.nvmrc`), pnpm 11. Local backend: Docker + the Supabase CLI (`pnpm exec supabase`, installed as a dev dependency).

## Design rules (do not break)

- Brand colours: only `#e52a30` and white. Neutrals only for text, borders, surfaces. Red text under 24px and hover states use
  `#b81f24`. White text on red: weight 500/700, 14px+.
- One component per thing, reused everywhere (Header, Footer, EventCard, MemberCard, forms…). Do not restyle per page.
- Forms: label above, help text, error with icon + text, red focus ring, error summary at the top, states empty / errors / sending /
  success. Consent checkbox on every public form.
- Lists: page numbers; filters and page live in the URL. Empty states are designed for every list.
- Optional sections are hidden when they have no content.
- Mobile first; breakpoints 640 / 1024 / 1280; max content width 1200. WCAG AA, keyboard navigable, alt text required on every
  uploaded image.
- Admin is calmer: white/grey, red only for primary actions, counts that need action, errors and deletes. Mobile admin is for quick
  jobs.

## Decided behaviour (summary; full list in rules-and-settings.md and ARCHITECTURE §9)

- Events and Upcoming Events are one table. `/upcoming/[slug]` → 301 to `/events/[slug]` after the end date.
- "Deadline soon" 72 h and "Just ended" 14 days are admin settings. Waitlist on/off, max participants and admission
  (Selection / First come, D22) per event.
- Roles: Super admin / Editor / Event manager (own events + their applications only) / Member.
- Security: 2-step login required for super admins; 5 failed log-ins → 15-minute pause; reset links 30 min; confirmation links 24 h.
- Member sign-up → confirm e-mail → board approval. Default visibility "Members only", enforced by RLS.
- CV sharing is opt-in only, separate consent, Main-package partners only, deleted on opt-out.
- Delete account: "Also delete my Memories" checkbox (default off → "A former member").
- Memory edits after publishing need re-approval; the live version stays meanwhile.
- Ideas & feedback statuses: New / Under review / Accepted / Archived. Anonymous ideas store no identity. /submit: spam check +
  honeypot + 5 per hour.
- Phase 1 hides everything that needs member accounts (header "Log in", "Share your impression", Memories sections).
- D23–D30 confirmed by the owner 2026-11-09: no `member_events` table (derived from accepted applications + `event_managers`);
  withdrawing an application deletes it; the board's CV export and its log are built in M22; `/submit` attachment ≤ 4 MB and
  feedback photos ≤ 400 KB each.

## Code structure (enforced by ESLint)

- `src/app/`: thin routes only. `src/features/<name>/`: one domain each (components, data, actions, schemas, types).
  `src/shared/`: design system, layout, lib, config, i18n.
- Features expose `index.ts` (client-safe), `server.ts` (server-only), `admin.ts` (admin UI), `public.ts` (public screens for routes
  and the lab); no deep imports between features; `shared` never imports features.
- Database: `supabase/migrations/*.sql` (never edit an applied migration that is on `main`: add a new one),
  `supabase/tests/database/*.test.sql` (pgTAP), conventions in `supabase/AGENTS.md`.

## Commands

```bash
pnpm dev            # dev server
pnpm check          # typecheck, lint, format, unit, i18n keys
pnpm build          # must pass with no env vars
pnpm e2e            # Playwright (desktop + mobile); CI runs it in 4 shards: pnpm e2e --shard=1/4
pnpm db:start | db:reset | db:test | db:lint | db:stop   # local Supabase (Docker)
```

## Working style

- Build in the milestone order of `docs/ARCHITECTURE.md` §8. Finish one route end to end (data → admin → public page → states)
  before the next. Backend milestones go sub-PR by sub-PR (see `docs/HANDOFF.md`).
- After each milestone: stop, show what changed and how to check it, and wait for "go" from the owner.
- Match the screenshots closely; when the screenshot and the design source disagree, the design source wins.
- Never invent content: seed the database with the sample content from the design sources and mark it as sample data.
- Ask before changing a DECIDED rule, a status list or the colour palette.
- Milestones ship as small PRs (M19b, c, d…), one branch each, conventional commits, opened with `gh`. Under the owner's standing
  instruction, merge your own PRs (squash, delete branch) once CI is green, then stop at the end of the milestone with a report and
  wait for "go". Never merge on red CI. Do not stack PRs (squash-merging the base conflicts the rest).
- When a milestone adds sample content, update `docs/sample-data.md`; when it adds Macedonian strings, add a row to
  `docs/i18n-review.md`; add "Notes from building (Mx)" to `docs/ARCHITECTURE.md`; record new decisions as D31+ marked "not yet
  confirmed by the owner".
- Before every push: `pnpm check`, an empty-env `pnpm build`, and the e2e the way CI does
  (`FEATURE_FLAGS=phase2 ENABLE_DEV_SURFACES=true CI=true pnpm e2e`); new specs with `--repeat-each=3`. For database changes:
  `pnpm db:reset && pnpm db:test && pnpm db:lint`.

## Gotchas learned while building

- The mock store lives on `globalThis` and survives hot reloads: restart `pnpm dev` after changing a fixture.
- Client components only get the i18n namespaces listed in `src/app/[locale]/layout.tsx`: add the namespace there when a client
  component needs strings.
- A `'use client'` file's non-component exports (constants, lists) cannot be used by server code: keep them in `types.ts`.
- Move focus after a state change (error summary, confirmation, failure notice) in a `useEffect`, never in `requestAnimationFrame` or
  a timer: it races with rendering.
- Tailwind: no arbitrary colours (lint); use the theme tokens (`border-line`, `text-ink-2`…). `better-tailwindcss` also rejects
  unnecessary classes.
- Boundaries: a feature's tests cannot import another feature's fixtures; features talk through `index.ts` / `server.ts` only.
- Cache Components: call `now()` only inside cached or dynamic code. Next keeps the previous page mounted, so ids can duplicate: e2e
  tests target visible elements and regions.
- e2e: the mock store is shared by tests running in parallel (and CI shards each have their own server), so tests that change content
  restore it, and new content is created switched off or hidden. dnd-kit starts listening for arrow keys one task after pick-up: wait
  about 150 ms after Space. Wait out animations before axe.
- Commits: the scope is an enum (`commitlint.config.ts`: feature names + `app ui admin-ui layout i18n data config deps e2e docs ci`;
  no `inbox`, no `db`), the subject starts in lower case, the header is at most 100 characters.
- e2e keyboard: no Home/End line shortcuts (they differ on macOS); delete typed text with Backspace. A read-only test that counts rows
  can see another test's temporary rows (shared mock store): compare names, not counts.
- Server Actions can be passed from a server component to a small client control as props (the Inbox does this), so a list/detail
  screen stays a server component.
- Page weight: a client component must not (transitively) import `zod`, and importing another feature's `index.ts` from a client
  component takes the whole barrel along. Forms keep constants in `*-fields.ts` and `import()` the schema on focus or submit. Leaflet
  loads when the map is near the screen, so e2e tests scroll the map into view before looking for pins.
- `pnpm lighthouse` needs a production build made with `NEXT_PUBLIC_SITE_URL=http://localhost:3200` (otherwise the canonical audit
  fails). Metadata: leave a key out instead of passing `undefined` or `""` when it is empty, or the layout's value is hidden.
- The axe helper waits for finite transitions; a form's focus moves in a `useEffect`, never in `requestAnimationFrame` (validation
  that awaits a lazy chunk renders later than the frame).
- Entries: `index.ts` is imported by other features (and, through them, by the proxy): keep UI out of it. A feature's public screens
  for routes and the lab go in `public.ts`.
- Vercel refuses request bodies over about 4.5 MB: files that travel through a Server Action must stay under it (`/submit` limits were
  lowered in M18d; CVs of 5 MB are still open, M20).
- A cookie change or `refresh()` inside a Server Action re-renders the current page (a redirect then wipes client state).
- Flaky specs seen in CI (re-run the failed job, harden if yours): admin-foundation login redirect, admin-users invite/withdraw
  (mobile), application form builder, privacy editor clean-up, Google Fonts download failure during the build.
