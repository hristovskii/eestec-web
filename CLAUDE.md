# eestec.mk — project instructions for Claude Code

It tells Claude Code how to build and change the site.

## What we are building

The website of EESTEC LC Skopje (eestec.mk): a public site, member accounts (Phase 2) and an Admin Panel through which the board edits **everything**. Nothing on the public site is hard-coded.

## Sources of truth (read before changing anything)

0. `docs/ARCHITECTURE.md`: the approved architecture, folder rules, milestones and the decisions log (§9, D1–D22). It overrides everything below where they differ.
1. `specs/00-overview-and-design-system.md` … `specs/11-admin-panel.md` (the original specs)
2. `handoff/docs/rules-and-settings.md` (decisions made during design; they override the specs where they differ)
3. `handoff/docs/routes.md`, `handoff/docs/components.md`, `handoff/docs/data-model.md`, `handoff/supabase/schema.sql`
4. `handoff/screens/*.jpg` (what it must look like) and `handoff/design-source/*.dc.html` (exact markup, spacing, copy, states). Find a frame in `handoff/docs/frames.md`.

Also read before building: `docs/sample-data.md` (every kind of sample content and who replaces it) and `docs/i18n-review.md` (Macedonian strings still to be reviewed).

## Stack

- Next.js 16 (App Router, Cache Components, TypeScript strict), React Server Components by default; client components only for interactivity. Next 16 differs from older versions: check `node_modules/next/dist/docs/` before using an API (e.g. `proxy.ts` replaces middleware, `next/root-params`).
- Frontend first: all data goes through per-feature repository interfaces with mock implementations; Supabase (Postgres + RLS on every table, Auth, Storage, Edge Functions + cron) comes last, behind the same interfaces.
- Styling: Tailwind v4 + shadcn/ui, themed only from `handoff/docs/tokens.css` (`src/shared/styles/`). Roboto via `next/font` (300/400/500/700, latin + cyrillic).
- i18n with next-intl: **Macedonian is the default** (unprefixed URLs), English under `/en`. UI strings in `src/shared/i18n/messages/{mk,en}.json`; drafted MK strings are tracked in `docs/i18n-review.md`. Board content is `{ mk, en? }` with EN falling back to MK. The admin UI is English.
- Leaflet + OpenStreetMap for the committee map.

## Design rules (do not break)

- Brand colours: only `#e52a30` and white. Neutrals only for text, borders, surfaces. Red text under 24px and hover states use `#b81f24`. White text on red: weight 500/700, 14px+.
- One component per thing, reused everywhere (Header, Footer, EventCard, MemberCard, forms…). Do not restyle per page.
- Forms: label above, help text, error with icon + text, red focus ring, error summary at the top, states empty / errors / sending / success. Consent checkbox on every public form.
- Lists: page numbers; filters and page live in the URL. Empty states are designed for every list.
- Optional sections are hidden when they have no content.
- Mobile first; breakpoints 640 / 1024 / 1280; max content width 1200. WCAG AA, keyboard navigable, alt text required on every uploaded image.
- Admin is calmer: white/grey, red only for primary actions, counts that need action, errors and deletes. Mobile admin is for quick jobs.

## Decided behaviour (summary — full list in rules-and-settings.md)

- Events and Upcoming Events are one table. `/upcoming/[slug]` → 301 to `/events/[slug]` after the end date.
- "Deadline soon" 72 h and "Just ended" 14 days are admin settings. Waitlist on/off, max participants and admission (Selection / First come, D22) per event.
- Roles: Super admin / Editor / Event manager (own events + their applications only) / Member.
- Security: 2-step login required for super admins; 5 failed log-ins → 15-minute pause; reset links 30 min; confirmation links 24 h.
- Member sign-up → confirm e-mail → board approval. Default visibility "Members only", enforced by RLS.
- CV sharing is opt-in only, separate consent, Main-package partners only, deleted on opt-out.
- Delete account: "Also delete my Memories" checkbox (default off → "A former member").
- Memory edits after publishing need re-approval; the live version stays meanwhile.
- Ideas & feedback statuses: New / Under review / Accepted / Archived. Anonymous ideas store no identity. /submit: spam check + honeypot + 5 per hour.
- Phase 1 hides everything that needs member accounts (header "Log in", "Share your impression", Memories sections).

## Code structure (enforced by ESLint)

- `src/app/`: thin routes only. `src/features/<name>/`: one domain each (components, data, actions, schemas, types). `src/shared/`: design system, layout, lib, config, i18n.
- Features expose `index.ts` (client-safe), `server.ts` (server-only), `admin.ts` (admin UI); no deep imports between features; `shared` never imports features.
- Commands: `pnpm dev`, `pnpm check` (typecheck, lint, format, unit, i18n keys), `pnpm build` (must pass with no env vars), `pnpm e2e`.

## Working style

- Build in the milestone order of `docs/ARCHITECTURE.md` §8. Finish one route end to end (data → admin → public page → states) before the next.
- After each milestone: stop, show what changed and how to check it, commit (conventional commit), and wait for "go".
- Match the screenshots closely; when the screenshot and the design source disagree, the design source wins.
- Never invent content: seed the database with the sample content from the design sources and mark it as sample data.
- Ask before changing a DECIDED rule, a status list or the colour palette.
- Milestones ship as small PRs (M10a, b, c…), one branch each, conventional commits, opened with `gh`. Under the owner's standing instruction Claude merges its own PRs once CI is green, then stops at the end of the milestone with a report and waits for "go". When a milestone adds sample content, update `docs/sample-data.md`; when it adds Macedonian strings, add a row to `docs/i18n-review.md`; add "Notes from building (Mx)" to `docs/ARCHITECTURE.md`.

## Gotchas learned while building

- The mock store lives on `globalThis` and survives hot reloads: restart `pnpm dev` after changing a fixture.
- Client components only get the i18n namespaces listed in `src/app/[locale]/layout.tsx`: add the namespace there when a client component needs strings.
- A `'use client'` file's non-component exports (constants, lists) cannot be used by server code: keep them in `types.ts`.
- Move focus after a state change (error summary, confirmation, failure notice) in a `useEffect`, never in `requestAnimationFrame` or a timer: it races with rendering.
- Tailwind: no arbitrary colours (lint); use the theme tokens (`border-line`, `text-ink-2`…). `better-tailwindcss` also rejects unnecessary classes.
- Boundaries: a feature's tests cannot import another feature's fixtures; features talk through `index.ts` / `server.ts` only.
- Cache Components: call `now()` only inside cached or dynamic code. Next keeps the previous page mounted, so ids can duplicate: e2e tests target visible elements and regions.
- e2e: the mock store is shared by tests running in parallel, so tests that change content restore it, and new content is created switched off or hidden. dnd-kit starts listening for arrow keys one task after pick-up: wait about 150 ms after Space. Wait out animations before axe.
- Commits: the scope is an enum (`commitlint.config.ts`, feature names + areas; there is no `inbox` scope) and the subject starts in lower case.
- e2e keyboard: no Home/End line shortcuts (they differ on macOS); delete typed text with Backspace. A read-only test that counts rows can see another test's temporary rows (shared mock store): compare names, not counts.
- Server Actions can be passed from a server component to a small client control as props (the Inbox does this), so a list/detail screen stays a server component.
