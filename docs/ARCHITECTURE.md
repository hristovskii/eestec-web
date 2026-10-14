# eestec.mk — Architecture & Implementation Plan

> Approved 2026-10-05. Decisions taken after approval are in §9.

## Context

The repository contains only sources of truth: `specs/00–11`, `handoff/` (rules, routes, components, data model, draft `schema.sql`, 126 canvas frames as `screens/*.jpg` + `design-source/*.dc.html`) and logos in `public/`. There is no application code yet.

We need an architecture for the EESTEC LC Skopje site (public site, member area, admin panel) that is professional, readable, scalable and maintainable, built **frontend first**: every page and admin screen runs on mock repositories seeded with the canvas sample content, and Supabase is plugged in last behind the same interfaces without touching pages or components.

**Decisions taken with you (in addition to the stated constraints)**

| Topic             | Decision                                                                                                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Styling           | Tailwind CSS v4 (latest) + shadcn/ui, themed strictly to `handoff/docs/tokens.css`                                                                                                                         |
| Languages         | **Macedonian is the default** (`/events`), English secondary (`/en/events`). UI strings in nested JSON per locale. This reverses spec 00 §4 / CLAUDE.md ("EN now, MK later"); CLAUDE.md gets updated at M0 |
| Content languages | Every board-editable text is `{ mk (required), en (optional) }`; English pages fall back to MK per field                                                                                                   |
| Sequencing        | All frontend first (Phase 1 **and** Phase 2 on mocks), Supabase last                                                                                                                                       |
| Component lab     | `/design-system` route (dev + preview only, 404 in production)                                                                                                                                             |

**Stack:**

- Next.js 16 (App Router, latest 16.x, 16.3 at time of writing) with Cache Components.
- React 19, TypeScript strict.
- next-intl 4, Tailwind v4, shadcn/ui (Radix base), zod 4.
- ESLint 9: the plugins bundled in `eslint-config-next` don't support ESLint 10 yet.
- pnpm, Node 24 LTS, Vercel.

---

## 1. Architecture and folder tree

### 1.1 Layers and dependency rule

```
app/  ──►  features/<name>  ──►  shared/
 (routes)     (domain modules)      (design system, layout, lib, config, i18n, data infra)
```

- **`app/`** holds routes only: read params, call feature queries, render feature components, set metadata. No business logic, no markup beyond composition.
- **`features/<name>/`** owns one domain end to end: types, rules, zod schemas, repository (interface + mock + later Supabase), server queries, server actions, public and admin components.
- **`shared/`** is domain-agnostic and must never import from `features/` or `app/`.
- Features may use other features **only through their public entry points**, and the feature graph must stay acyclic (lint-enforced). Prefer composing in the route over feature-to-feature imports.

**Why:** every feature can be read, tested and replaced in isolation. Shared code stays generic, so the design system cannot drift per page.

### 1.2 Root

```
.
├─ CLAUDE.md                     project rules (updated at M0: MK default, folder rules, this doc as a source)
├─ docs/ARCHITECTURE.md          this document
├─ specs/  handoff/              sources of truth (read-only)
├─ public/
│  ├─ brand/                     LC_Skopje_red.png, LC_Skopje_white.png, eestecredsquare.png, edyt.png (defaults; admin can replace)
│  └─ sample/                    sample sponsor logos + map placeholders from handoff/design-source/assets (SAMPLE)
├─ src/  (app, features, shared — below)
├─ e2e/                          Playwright specs per route + a11y + visual
├─ scripts/                      check-i18n-keys.ts; later generate-seed.ts (fixtures → supabase/seed.sql)
├─ supabase/                     (backend phase) migrations/, seed.sql, functions/
├─ components.json               shadcn config, aliases into src/shared/ui
├─ next.config.ts  tsconfig.json  eslint.config.mjs  prettier.config.mjs  vitest.config.ts  playwright.config.ts
├─ .env.example                  every variable documented, all optional
├─ .env.development              committed, no secrets (turns Phase 2 flags on locally)
└─ lefthook.yml  commitlint.config.ts  .github/workflows/ci.yml  .github/pull_request_template.md
```

### 1.3 `src/app` — routes only

```
src/app/
├─ global-error.tsx                 last-resort boundary when a root layout crashes
├─ [locale]/                         public root layout: <html lang>, Roboto, NextIntlClientProvider, Toaster
│  ├─ layout.tsx (generateStaticParams: mk, en)  error.tsx
│  ├─ (site)/                        Header + Footer layout (sticky header, skip link)
│  │  ├─ layout.tsx  not-found.tsx  [...rest]/page.tsx (→ notFound, keeps header/footer)
│  │  ├─ page.tsx                    /            Home
│  │  ├─ events/      (list)/page.tsx  (list)/loading.tsx  [slug]/page.tsx
│  │  ├─ upcoming/    (list)/page.tsx  (list)/loading.tsx  [slug]/page.tsx  [slug]/calendar/route.ts (.ics download)
│  │  ├─ journey/  join/  partners/  contact/  privacy/       page.tsx
│  │  ├─ members/     page.tsx  [username]/page.tsx           (P2)
│  │  ├─ memories/    page.tsx  [slug]/page.tsx               (P2)
│  │  ├─ submit/page.tsx                                      (P2)
│  │  ├─ (auth)/      login/ register/ forgot-password/ reset-password/   (P2, guests only)
│  │  └─ (member)/    layout.tsx = requireMember()            (P2)
│  │     ├─ profile/page.tsx
│  │     └─ memories/new/page.tsx  memories/[slug]/edit/page.tsx
│  ├─ auth/confirm/route.ts                                    (P2) e-mail confirmation callback
│  └─ design-system/page.tsx         component lab, 404 in production
├─ admin/                            admin root layout: <html lang="en">, data-density="compact", Toaster
│  ├─ layout.tsx
│  ├─ login/page.tsx                 sign-in · forgot · link sent · 2-step (state in search params)
│  └─ (panel)/                       requireStaff() + AdminShell (sidebar counts, topbar)
│     ├─ layout.tsx  page.tsx        dashboard
│     ├─ approvals/  inbox/  applications/ (+ [eventId]/form/)
│     ├─ events/ (page · new/ · [id]/ · types/)
│     ├─ pages/ home/ map/ journey/ join/ sponsors/ contact/
│     ├─ members/  memories/  ideas/                           (P2)
│     └─ media/  settings/  users/
├─ api/export/[resource]/route.ts    CSV/XLSX downloads (permission-checked)
├─ sitemap.ts  robots.ts  icon.png
src/proxy.ts                         Next 16 proxy (formerly middleware), one per request:
                                       public paths → next-intl routing + scoped redirect lookups for
                                       /(en/)?upcoming/:slug (ended → 301) and /(en/)?events/:slug (old slugs → 301);
                                       /admin, /api → no locale routing (Supabase session refresh later);
                                       skips /_next and files
```

**Why:**

- **Two root layouts.** The public site is localized under `[locale]`. The admin is English-only and outside it, so no locale prefixes appear in admin URLs and the admin can use its own density and theme.
- **Route groups by audience.** `(site)` holds the public chrome, `(auth)` guest-only pages, `(member)` the session guard, and `(panel)` the admin shell and guard. Guards sit in layouts, and every server action re-checks permissions, because a layout guard alone is not a security boundary.
- **URLs.** With `localePrefix: 'as-needed'` and default `mk`, Macedonian URLs are exactly the ones in `routes.md`; English adds `/en`.
- **`(list)` groups.** The list pages' `loading.tsx` must not wrap `[slug]`. Once a loading shell has streamed, the status is already 200, so `notFound()` and redirects could no longer set a real status. Detail pages therefore resolve their status before streaming, and the decided **301 redirects happen in the proxy**. The lookup is scoped to the two slug patterns (one indexed read; the proxy can't use `'use cache'`).
- **No dots in segment names.** The calendar route is `[slug]/calendar` and returns `Content-Disposition: attachment; filename=<slug>.ics`. next-intl's matcher skips paths that contain a dot, so a `calendar.ics` folder would 404 under the MK locale.

### 1.4 `src/features` — one folder per domain

```
src/features/events/                 (anatomy; small features omit folders they don't need)
├─ index.ts          PUBLIC, client-safe: components, types, zod schemas, pure helpers, server actions
├─ server.ts         PUBLIC, server-only: queries for routes and other features' server code
├─ admin.ts          PUBLIC, admin UI + admin actions; importable only from app/admin
├─ types.ts          domain + view-model types (Event, EventSummary, EventDetail, EventWriteModel…)
├─ domain/           pure rules, no I/O, unit-tested: event-phase.ts, application-state.ts, date-range.ts
├─ schemas/          zod: archive-params.schema.ts (URL), event-draft.schema.ts, event-publish.schema.ts
├─ data/
│  ├─ events.repository.ts             interface (the contract)
│  ├─ events.repository.contract.ts    shared contract test suite (runs against every implementation)
│  ├─ events.mock.ts                   in-memory implementation
│  ├─ events.supabase.ts               (backend phase)
│  ├─ fixtures/events.ts               SAMPLE DATA from handoff/design-source (isSample: true)
│  └─ index.ts                         eventsRepository(): picks the implementation (server-only)
├─ queries.ts        server reads: repository + caching + mapping to view models
├─ cache-tags.ts     tag names used by queries (cacheTag) and actions (revalidate)
├─ actions/          'use server' mutations: validate → authorize → repository → revalidate
└─ components/
   ├─ event-card.tsx  events-archive.tsx  event-filters.tsx  event-detail.tsx  event-gallery.tsx …
   └─ admin/  events-table.tsx  event-edit-form.tsx  event-types-editor.tsx
```

**Why three entry points:**

- **`index.ts` must stay client-safe.** A barrel that mixes server-only code (repositories, `import 'server-only'`) with client components breaks the build as soon as a client component imports it. So server code gets its own `server.ts`.
- **`admin.ts` keeps admin code out of public bundles** (rich-text editor, drag and drop, tables).
  - Lint forbids `@/features/*/admin` imports from `app/[locale]` and from any feature's public code.
  - A feature's own admin components _may_ import another feature's `admin.ts`, e.g. NotesPanel from `notes`.
- **Everything else is private to the feature.** Deep imports like `@/features/events/components/...` from outside the feature are lint errors.

**Data flow is "routes fetch, features render":**

- Feature components are presentational (props in, UI out).
- That lets the same components render in the `/design-system` lab, in unit tests (with fixtures) and in pages.
- Route-level `loading.tsx` provides the designed loading skeletons.

### 1.5 `src/shared`

```
src/shared/
├─ ui/
│  ├─ primitives/     shadcn/ui generated + restyled to tokens (button, input, dialog, sheet, sidebar, …)
│  ├─ form/           field kit: form-field, error-summary, consent-field, form-success, file-dropzone,
│  │                  star-rating, segmented-choice, password-strength, honeypot, char-counter
│  └─ <composite>/    section-title, page-header, hero-band, section, container, chip, filter-chip,
│                     status-badge, link-tabs, pagination, breadcrumbs, empty-state, notice, countdown,
│                     media-card, media-image, lightbox, gallery-grid, rich-text, icon-card, stat-tile,
│                     initials-avatar, copy-button, share-buttons, stepper, back-to-top
├─ admin-ui/          admin-page (page header, tabs, badge, panel), data-table (+ bulk bar, row menu, mobile
│                     cards), filter-bar, table-pagination, save-bar, localized-field, dialogs (delete, reject,
│                     unsaved changes), use-url-params, stat-card; later: edit-form-layout, form-section,
│                     slug-field, date-time-field, chip-multi-select, sortable-list, rich-text-editor,
│                     image-field, gallery-field, file-field, activity-feed, approval-split-view,
│                     mobile-decision-bar, inbox-split-view, export-popover, notes-panel-view
├─ layout/
│  ├─ site/           header, mobile-nav, account-menu, locale-switcher, footer, skip-link, sample-data-ribbon
│  └─ admin/          admin-shell, admin-sidebar, admin-topbar, admin-mobile-header, admin-page-header
├─ forms/             use-action-form.ts, action-result.ts, create-action.ts, spam-guard.ts,
│                     use-unsaved-changes.ts, use-autosave.ts
├─ hooks/             shadcn hooks (use-mobile) + generic hooks (use-media-query, use-now)
├─ data/              paged.ts, select-implementation.ts, mock/ (store, paginate, reset-registry),
│                     uploads.ts (two-step upload port), rate-limit/ (port + in-memory impl),
│                     supabase/ (backend phase: anon client, session client, generated types)
├─ i18n/              routing.ts, navigation.ts, request.ts, localized.ts, format.ts,
│                     messages/mk.json, messages/en.json (site, nested per feature), messages/admin.en.json
├─ lib/               cn.ts, clock.ts, dates.ts, slug.ts, search-params.ts, csv.ts, sanitize-html.ts, initials.ts
├─ config/            env.ts, flags.ts, data-source.ts, site.ts (nav order, page sizes), routes.ts (typed hrefs)
├─ styles/            globals.css (Tailwind + @theme), tokens.css (verbatim copy of handoff tokens), prose.css
└─ types/             media.ts (Media value object: url, width, height, alt, credit), localized.ts
```

**Why:**

- **Primitives vs composites.** shadcn components are owned code, generated into `ui/primitives` and restyled once. Brand composites are built on top of them.
- **Admin patterns live apart.** The admin patterns are a second, denser layer, kept in `admin-ui` so the public bundle never pulls them in.
- **Header and Footer are presentational** (props: nav, settings, session summary) because `shared/` cannot import features. The `(site)` layout fetches their data.

**Conventions:**

- **Naming:** kebab-case file names (the shadcn convention), PascalCase components, `use-*.ts` hooks.
- **Tests:** colocated `*.test.ts(x)`.
- **Barrels:** named re-exports only; no `export *`.

---

## 2. Features and what each owns

| Feature        | Owns (data)                                                                                                                                                                     | Public UI                                                                                | Admin UI                                                                    | Depends on                                                          | Phase                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------- |
| `settings`     | site settings (branding, events thresholds 72 h / 14 d / defaults, contact & legal, weekly meeting, languages, security), board roles, social links, SEO per page, privacy text | footer/contact data, `/privacy`                                                          | `/admin/settings` (all tabs)                                                | —                                                                   | 1                      |
| `media`        | media items (url, size, dimensions, alt, credit), uploads                                                                                                                       | — (rendering is `shared/ui/media-image`)                                                 | `/admin/media`, connected `MediaField` / `GalleryField`                     | —                                                                   | 1                      |
| `auth`         | session, admin roles, permissions policy, login attempts / lockout, 2-step, member sign-up / reset / confirm, account deletion                                                  | AuthForm (all states), account-menu data                                                 | admin login + states, guards `requireStaff/requireMember/requirePermission` | —                                                                   | 1 (admin), 2 (members) |
| `admin-users`  | admin users, invites, event-manager assignments                                                                                                                                 | —                                                                                        | `/admin/users`, invite dialog, permissions matrix                           | auth                                                                | 1                      |
| `events`       | events (upcoming + archive, one table), types, topics, gallery, event partners link, slug redirects                                                                             | EventCard (+ skeleton), archive, detail, gallery + lightbox, upcoming list, Next-up card | events list (filters, bulk), edit form, types                               | settings, media                                                     | 1                      |
| `applications` | per-event form definitions, applications, places / waitlist availability                                                                                                        | ApplyBox, dynamic ApplicationForm, sticky mobile apply bar, add-to-calendar              | applications list, statuses, CSV/XLSX, form builder                         | events, notes                                                       | 1                      |
| `home`         | hero, "What is EESTEC", activities, timeline, stats, section order / visibility                                                                                                 | home sections, timeline, animated stats                                                  | `/admin/pages/home`                                                         | media                                                               | 1                      |
| `committees`   | committees (LC / Observer / JLC, lat/lng, link)                                                                                                                                 | CommitteeMap (Leaflet), legend, popup                                                    | `/admin/pages/map`                                                          | —                                                                   | 1                      |
| `journey`      | steps, quotes, final CTA                                                                                                                                                        | Journey page, JourneyStep, Home teaser                                                   | `/admin/pages/journey`                                                      | media                                                               | 1                      |
| `join`         | Join page blocks, benefits, steps, rules, FAQ, documents, open/closed round, membership applications                                                                            | Join page, JoinForm (+ closed state)                                                     | `/admin/pages/join`, Inbox › Membership tab                                 | notes                                                               | 1                      |
| `partners`     | sponsors, tiers, packages, single collaborations, partner page blocks, partner inquiries                                                                                        | PartnerLogo/PartnerLogos (home / wall / past), For Companies page, CompanyForm           | `/admin/pages/sponsors`, Inbox › Partners tab                               | media, notes                                                        | 1                      |
| `contact`      | contact subjects (routing e-mail, shortcut link), contact messages                                                                                                              | Contact page, ContactForm (subject routing notes)                                        | `/admin/pages/contact`, Inbox › Contact tab                                 | settings, notes                                                     | 1                      |
| `notes`        | internal notes on any inbox / idea / application item                                                                                                                           | —                                                                                        | NotesPanel                                                                  | —                                                                   | 1                      |
| `activity`     | activity log (read model; written by DB triggers in the backend phase)                                                                                                          | —                                                                                        | dashboard feed, Settings › Activity log                                     | —                                                                   | 1                      |
| `dashboard`    | nothing (aggregates counts and summaries)                                                                                                                                       | —                                                                                        | dashboard, sidebar counts                                                   | contact, partners, join, applications, approvals*, ideas*, activity | 1                      |
| `approvals`    | nothing (aggregates pending member registrations, Memories, Memory revisions)                                                                                                   | —                                                                                        | `/admin/approvals`, approve/reject flows, mobile decision bar               | members, memories                                                   | 2                      |
| `members`      | profiles, visibility, teams, badges, board mandates, alumni, CV consent, CV export for Main-package partners + export log (D9)                                                  | MemberCard (all variants), `/members`, profile + restricted view, My-profile sections    | `/admin/members`                                                            | settings, media                                                     | 2                      |
| `memories`     | memories, photos, revisions ("changes waiting"), status flow                                                                                                                    | MemoryCard, list, post (former / preview / changes waiting), editor (autosave)           | `/admin/memories`                                                           | events, media                                                       | 2                      |
| `ideas`        | idea types, ideas, impressions/feedback, ratings, /submit form settings                                                                                                         | `/submit` (both tabs, all states)                                                        | `/admin/ideas` (ideas, feedback, ratings, form settings)                    | events, notes                                                       | 2                      |
| `devtools`     | nothing (dev/preview only)                                                                                                                                                      | persona switcher, mock clock, reset mock data, flag view                                 | —                                                                           | auth                                                                | —                      |

\* `approvals` and `ideas` are Phase 2. Dashboard tiles for them render only when their flag is on.

**Composition rules:**

- **Inbox has no feature of its own.** `/admin/inbox` composes the Contact, Partners and Join inbox lists, all built on `shared/admin-ui/inbox-split-view`.
- **Home and My profile compose in the route.**
  - Home: `home.getHomeLayout()` returns the ordered, visible section keys, and the route maps each key to a section from `home`, `events`, `committees`, `journey`, `partners` or `memories`.
  - `/profile` composes `members`, `applications`, `memories` and `auth` sections.
- **Cross-feature writes happen in one data-layer call, never orchestrated in UI code.** Examples are delete account and "Turn this impression into a Memory": `auth.deleteAccount({ alsoDeleteMemories })` and `ideas.submitImpression({ asMemory })` each become one transactional RPC in Supabase. Each mock only models its own feature's state.

---

## 3. Route map

**Public** (`app/[locale]/(site)`, MK default, EN under `/en`):

| Route                                                                      | Feature(s)                                                   | Notes                                                                                            | Phase |
| -------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ----- |
| `/`                                                                        | home + events + committees + journey + partners (+ memories) | sections in admin-configured order; empty sections hide                                          | 1     |
| `/events`                                                                  | events                                                       | `?tab=local\|international&type=&year=&q=&sort=&page=`, 12 per page                              | 1     |
| `/events/[slug]`                                                           | events (+ partners, memories)                                | gallery/lightbox, video, prev/next, "Just ended" banner; unknown slug checks slug redirects      | 1     |
| `/upcoming`                                                                | events + applications                                        | soonest first, `?scope=local\|international`, Next-up card, no pagination                        | 1     |
| `/upcoming/[slug]`                                                         | events + applications                                        | ApplyBox, application form, waitlist, external link; **ended → 301 to `/events/[slug]` (proxy)** | 1     |
| `/upcoming/[slug]/calendar`                                                | events                                                       | .ics download (route handler); Google Calendar link built client-side                            | 1     |
| `/journey`, `/join`, `/partners`, `/contact`, `/privacy`                   | journey, join, partners, contact + settings, settings        | `/privacy` uses the Contact layout                                                               | 1     |
| `/members`, `/members/[username]`                                          | members                                                      | visibility via policy (later RLS); `?team=&year=&q=&sort=&page=&board=`                          | 2     |
| `/memories`, `/memories/[slug]`                                            | memories                                                     | `?event=&year=&place=&author=&q=&sort=&page=`; `?preview` for the author                         | 2     |
| `/submit`                                                                  | ideas                                                        | `?tab=idea\|impression&event=<slug>`                                                             | 2     |
| `/login` `/register` `/forgot-password` `/reset-password`, `/auth/confirm` | auth                                                         | `(auth)` group: guests only                                                                      | 2     |
| `/design-system`                                                           | all                                                          | dev + preview only                                                                               | —     |

**Logged-in member** (`(member)` group, `requireMember()`): `/profile`, `/memories/new`, `/memories/[slug]/edit` (Phase 2). The slug generator reserves `new`, because the static route would shadow a Memory with that slug.

**Admin** (`app/admin`, English only, `requireStaff()` + per-route `requirePermission()`):

| Route                                                                            | Permission                                     | Phase |
| -------------------------------------------------------------------------------- | ---------------------------------------------- | ----- |
| `/admin/login`                                                                   | public                                         | 1     |
| `/admin`                                                                         | dashboard.view                                 | 1     |
| `/admin/approvals?type=members\|memories`                                        | approvals.manage                               | 2     |
| `/admin/inbox?tab=contact\|partners\|membership`                                 | inbox.manage                                   | 1     |
| `/admin/events`, `/new`, `/[id]`, `/types`                                       | events.manage (event manager: own events only) | 1     |
| `/admin/applications?event=`, `/admin/applications/[eventId]/form`               | applications.manage (own events for managers)  | 1     |
| `/admin/pages/{home,map,journey,join,sponsors,contact}`                          | pages.edit                                     | 1     |
| `/admin/media`                                                                   | media.manage (managers: own uploads)           | 1     |
| `/admin/settings` (tabs as `#hash`), `/admin/users`                              | settings.manage / users.manage (super admin)   | 1     |
| `/admin/members`, `/admin/memories`, `/admin/ideas?tab=ideas\|feedback\|ratings` | members / memories / ideas .manage             | 2     |

**Phase gating:**

- `shared/config/flags.ts` holds the launch values in code: Phase 2 off.
- They can be overridden by `FEATURE_FLAGS` (e.g. `phase2,memoriesMap`), which the committed `.env.development` sets.
- When a flag is off, its routes call `notFound()`, the header hides Log in / Members / Memories, the related CTAs and sections hide, and the admin sidebar hides the items.

---

## 4. Data layer

### 4.1 Contracts

```ts
// shared/data/paged.ts
export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number; pageCount: number };

// features/events/data/events.repository.ts
export interface EventsRepository {
  listArchive(q: ArchiveQuery & { locale: Locale; now: Date }): Promise<Paged<EventSummary>>;
  archiveFacets(q: ArchiveFacetsQuery): Promise<{ counts: Record<EventScope, number>; years: number[] }>;
  listUpcoming(q: { locale: Locale; now: Date; scope?: EventScope }): Promise<EventSummary[]>;
  findBySlug(slug: string, locale: Locale): Promise<EventDetail | null>;
  findAdjacent(slug: string, locale: Locale): Promise<{ prev: EventLink | null; next: EventLink | null }>;
  // admin (write models carry Localized<string> fields)
  adminList(q: AdminEventsQuery): Promise<Paged<AdminEventRow> & { counts: AdminEventCounts }>;
  getForEdit(id: string): Promise<EventWriteModel | null>;
  save(input: EventWriteModel): Promise<{ id: string }>;
  setStatus(ids: string[], status: ContentStatus): Promise<void>;
  remove(id: string): Promise<void>;
}
```

**Rules:**

- **Shapes.** Repositories return domain or view models, never DB rows. They take explicit `locale` and `now` arguments, so results are deterministic, cache-keyable and testable.
- **Read models are already localized** (plain strings, EN → MK fallback applied). Admin write models carry `Localized<T> = { mk: T; en?: T }`.
- **Errors.**
  - `null` means not found.
  - Infrastructure errors throw and are caught by `error.tsx`.
  - Expected domain failures (slug taken, applications closed, full, rate limited) come back as typed results from actions.
- **Size.** One interface per aggregate. Split it (e.g. into public and admin) only when it grows past about a dozen methods (ISP, applied pragmatically).
- **Time-dependent state is pure.**
  - `events/domain/event-phase.ts`: upcoming / ended / just-ended.
  - `applications/domain/application-state.ts`: `not_open | opening_soon | open | deadline_soon | closed | full_waitlist | full | external`.
  - Both take `(event, now, settings, availability)`, and both are unit-tested at every boundary.

### 4.2 Mock implementation

- **Store.** Each feature keeps an in-memory store seeded from its `fixtures/`, held on `globalThis` so it survives HMR, and registered for "Reset mock data" in devtools. Writes work (admin edits, form submissions), so every state can be exercised end to end.
- **Fixtures** are transcribed from the canvas `renderVals()` sample data.
  - They are marked `isSample: true`, with the source frame named in the file header.
  - They are normalized into **one consistent dataset**: canvas contradictions (people, slugs, counts) are resolved by picking one canvas value, never by inventing.
  - Counts are derived from the data, so numbers can differ from the illustrative ones on the canvas.
  - The design copy is English, so sample `mk` fields reuse the English text until the board supplies Macedonian content.
- **Mock clock.** It is pinned to the canvas moment, `2026-10-04T18:18 Europe/Skopje`, so deadline-soon, just-ended and countdowns match the screens. `MOCK_NOW=real` (or any ISO date) overrides it.
  - `shared/lib/clock` is the only place that reads time. On the server it is called only inside cached queries or dynamic code.
  - Countdowns render the static deadline on the server and start ticking after mount, using the same pin exposed as a public constant. That way there is no hydration mismatch, and the build never hits an uncached `new Date()`.
- **Dev-only knobs and markers:**
  - A `MOCK_MULTIPLY` dev knob clones list fixtures (visibly suffixed) so pagination like "Page 1 of 8" can be checked without inventing content.
  - Loading skeletons are reviewed in `/design-system`. Cached pages would hide artificial latency, so there is no latency knob.
  - A "Sample data" ribbon shows whenever `DATA_SOURCE=mock` outside development.
- **Uploads already use the final two-step shape:**
  - Step 1: `createUploadTarget()` returns a URL.
  - Step 2: the browser `PUT`s the file there, then `confirmUpload()` records it with dimensions, size and alt text.
  - Mocks: the target is a dev route that keeps the blob in memory.
  - Supabase: a signed Storage URL.
  - This avoids Server Action body limits (1 MB default, 4.5 MB on Vercel).
- **Auth mock.** A persona cookie selects visitor, pending member, member, event manager, editor or super admin (people taken from the canvas). The devtools persona switcher sets it. Admin login accepts persona e-mails and simulates every designed state: wrong password with attempts left, 15-minute lockout, 2-step code, reset link sent.

### 4.3 How the swap works

```ts
// shared/config/data-source.ts   — the single switch (one const tuple feeds both the type and the zod env enum)
export const DATA_SOURCES = ['mock'] as const;           // backend phase: ['mock', 'supabase']
export type DataSource = (typeof DATA_SOURCES)[number];
export const dataSource: DataSource = env.DATA_SOURCE;   // zod default: 'mock'

// shared/data/select-implementation.ts
// scope 'public' = cookie-less, cacheable reads of published content; 'session' = the visitor's/admin's session
export type RepoScope = 'public' | 'session';
type Impls<T> = { mock: (scope: RepoScope) => T | Promise<T>; supabase?: (scope: RepoScope) => Promise<T> };
export async function selectImplementation<T>(name: string, impls: Impls<T>, scope: RepoScope): Promise<T> {
  const impl = impls[dataSource];
  if (!impl) throw new NotImplementedError(`${name} has no ${dataSource} implementation`);
  return impl(scope);
}

// features/events/data/index.ts   (server-only)
export const eventsRepository = (scope: RepoScope = 'public') =>
  selectImplementation<EventsRepository>('events', { mock: createMockEventsRepository /*, supabase: createSupabaseEventsRepository */ }, scope);

// features/events/queries.ts      (server-only; the only caller of the repository)
export async function getEventsArchive(params: ArchiveParams, locale: Locale) {
  'use cache';
  cacheTag(eventTags.list);
  cacheLife('events');                                   // custom profile { stale: 60, revalidate: 300, expire: 600 }
  const repo = await eventsRepository('public');
  return repo.listArchive({ ...params, locale, now: clock.now(), pageSize: 12 });
}

// app/[locale]/(site)/events/(list)/page.tsx   (thin route)
const filters = parseArchiveParams(await searchParams);
const [archive, facets] = await Promise.all([getEventsArchive(filters, locale), getArchiveFacets(filters, locale)]);
return <EventsArchive filters={filters} archive={archive} facets={facets} />;
```

**Swapping to Supabase:**

- Add `'supabase'` to `DATA_SOURCES`.
- Implement `*.supabase.ts` **one feature at a time**, each PR turning that feature's contract suite green against local Supabase.
- A unit test enumerates every repository getter and fails while any feature lacks a Supabase implementation, so the remaining work is a visible checklist. It is a test rather than a compile error so features can migrate in separate PRs.
- Set `DATA_SOURCE=supabase` per environment once the checklist is empty.
- Pages, components, queries and actions do not change.

**Why not one central container:** a composition root that imports every feature, imported back by feature actions, creates a dependency cycle across layers. A single switch plus per-feature registration keeps the graph acyclic and lets features migrate one by one.

**Supabase notes for later:**

- **Clients.** The scope picks the client:
  - `'public'`: a cookie-less anon client. Published content is readable through RLS, and `'use cache'` cannot read cookies.
  - `'session'`: the per-request cookie client, used for member-only and admin reads and for all writes. These stay dynamic, inside `<Suspense>`.
- **Sessions.** The proxy refreshes Supabase session cookies on every matched request, including `/admin`. Guards use `getClaims()`, never `getSession()`.
- **Localized columns** as `jsonb {mk, en}`.
- **Activity log** written by triggers.
- **Rate limit and lockout** on the `submission_log` / `login_attempts` tables.
- **Cron** (Edge Functions) only revalidates and cleans up, as decided.

---

## 5. Shared design system, mapped to the canvas

**Theming:**

- `tokens.css` is copied verbatim into `shared/styles/` and mapped into Tailwind `@theme`.
- **The default Tailwind palette is removed** (`--color-*: initial`), so only brand red, white and the token neutrals exist as classes.
  - `white`, `black`, `transparent` and `current` are redefined, because shadcn uses `bg-black/50` scrims and `text-white`.
  - The `sidebar-*` tokens are redefined as well.
- **shadcn semantic variables** (`--primary`, `--ring`, `--destructive`, `--border`, `--input`, `--muted`…) point at the same tokens.
- **No dark theme is designed.** The dark variant is bound to a class that is never applied (`@custom-variant dark (&:where(.dark, .dark *))`), so shadcn's `dark:` classes never follow the OS setting.
- **shadcn setup.** It is initialised with the Radix base (`init -b radix`) for Sonner and the mature primitives. The aliases are `ui → @/shared/ui/primitives`, `hooks → @/shared/hooks`, `lib/utils → @/shared/lib`.
- **Breakpoints** stay at the Tailwind defaults, which already match the design: `sm` 640 / `lg` 1024 / `xl` 1280.
  - `md` (768) is kept only because shadcn's Sidebar relies on it.
  - Our own code uses `sm`, `lg` and `xl`.
- **Admin density.** The admin root sets `data-density="compact"`, which switches `--btn-h` / `--input-h` to 36 px with no per-component props.

**Primitives (`shared/ui/primitives`, shadcn restyled).** Only primitives in use are generated; the rest are added in the milestone that first needs them.

| Primitive                                                                       | Variants / notes                                                                                                                     | Canvas                                                   | Status |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------ |
| Button                                                                          | primary, secondary, inverse (on red), outlineWhite, quiet, danger, ghost; sizes xl 52 · lg 48 · sm 40; 36 in admin via `--control-h` | Main › Buttons, ApplyBox, *Form                          | M1     |
| Input, Textarea, NativeSelect, Label                                            | 48 px, `#8c8c8c` border, red focus ring, error 2 px red                                                                              | Main › Forms                                             | M1     |
| Switch                                                                          | public 44×26, admin 36×20                                                                                                            | SubmitForm, AdminEventEdit                               | M1     |
| Dialog, Sheet                                                                   | modals (radius 16, scrim 55%), mobile filter sheet, admin drawer                                                                     | MyProfileStates, AdminDialogs, EventsList-Mobile-Filters | M1     |
| DropdownMenu, Accordion, Sonner (toasts), Skeleton, Separator                   | account menu, FAQ, toasts (bottom-right, 5 s, errors persist), loading                                                               | Header, JoinPage, AdminEditStates, EventCard             | M1     |
| InputOTP, Sidebar, Table, Popover, Command, Tooltip, Progress, Slider, Calendar | 2-step code, admin shell, admin tables, export popover, comboboxes, rail tooltips, upload bars, photo zoom, admin dates              | Admin*, MemoryEditor, MyProfileStates                    | M3+    |

Checkbox, radio and segmented choices are **native inputs** styled like the canvas (`shared/ui/form/choice.tsx`, `segmented-choice.tsx`), not Radix: the canvas draws native 20 px controls, and native inputs submit with forms and need no extra JS.

**Brand composites (`shared/ui`):**

| Component                                                                                                                                                                                                                                     | Canvas                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| SectionTitle (eyebrow, H2, 56×4 bar, intro, left / center)                                                                                                                                                                                    | Main                                                                          |
| PageHeader (grey band, breadcrumbs, H1, lead, actions), HeroBand (red)                                                                                                                                                                        | EventsList, Journey, JoinPage, PartnersPage                                   |
| Container, Section (96 / 64 rhythm, white / grey tone)                                                                                                                                                                                        | Main › Layout                                                                 |
| Chip (type, scope, outline, red, dark), FilterChip (link, pressed, count), RemovableTag                                                                                                                                                       | Main, EventsList                                                              |
| StatusBadge (one map for all application / content states)                                                                                                                                                                                    | Main, EventCard, ApplyBox, AdminEvents                                        |
| LinkTabs (URL tabs with counts), Breadcrumbs, Pagination (numbers on desktop; prev / next + "Page X of Y" on mobile)                                                                                                                          | EventsList                                                                    |
| EmptyState (icon, title, text, active-filter tags, actions)                                                                                                                                                                                   | EventsList-Empty, UpcomingList-Empty, MembersPage-Empty, MemoriesList-Empty   |
| MediaCard (16:10 cover, overlay badge, chips, clamped title, meta rows, CTA, hover lift, skeleton): the shell behind EventCard and MemoryCard                                                                                                 | EventCard                                                                     |
| MediaImage (`next/image` wrapper, required alt, size presets, red + white-logo fallback, sample placeholder)                                                                                                                                  | EventCard (no image)                                                          |
| Countdown (inline text, 3-cell, 4-cell timer; urgent variant)                                                                                                                                                                                 | Main, ApplyBox, Home hero                                                     |
| Lightbox (desktop thumbnails, mobile swipe, keyboard, focus trap), GalleryGrid (+N more)                                                                                                                                                      | Lightbox, MemoryLightbox, EventDetail, MemoryPost                             |
| RichText (sanitized HTML + prose styles)                                                                                                                                                                                                      | EventDetail, MemoryPost                                                       |
| Notice / Banner (info, urgent, dark preview bar)                                                                                                                                                                                              | EventDetail-Ended, MemoryEditor-Rejected, MemoryPost-Preview, MyProfileStates |
| IconCard, StatTile, Stepper, InitialsAvatar, CopyButton, ShareButtons, BackToTop                                                                                                                                                              | Home, PartnersPage, AuthStates, MemberCard, ContactPage, MemoryPost           |
| Icons: `lucide-react` (the canvas icons are Lucide-compatible); brand icons as local SVG                                                                                                                                                      | Main › Icons                                                                  |
| Form kit: FormCard, ErrorSummary ("Please fix N fields", links to fields, focus on submit), ConsentField, FormSuccess ("What happens next"), FileDropzone, StarRating, SegmentedChoice, PasswordStrength, Honeypot, SpamCheckRow, CharCounter | JoinForm, CompanyForm, ContactForm, AuthForm, SubmitForm + *States            |

**Layout (`shared/layout`):**

| Component                                                                                                                                                                                                                                      | Canvas                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Header (desktop / mobile / mobile-open; guest / member / menu; admin link; "Admin panel" also added to the mobile menu, which the canvas lacks), LocaleSwitcher (MK first, then EN, since MK is the default), AccountMenu, MobileNav, SkipLink | Header, HeaderStates                   |
| Footer (desktop / mobile)                                                                                                                                                                                                                      | Footer                                 |
| AdminShell, AdminSidebar (counts, rail, drawer), AdminTopbar (crumbs, search, bell, user menu), AdminMobileHeader, AdminPageHeader                                                                                                             | AdminSidebar, AdminTopbar, AdminMobile |

**Admin patterns (`shared/admin-ui`):**

| Component                                                                                                                                                                                                                             | Canvas                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| DataTable (plain table: selection + bulk bar, URL sort headers, row menu, cards below 768 px), FilterBar (mobile: sheet), TablePagination (rows per page)                                                                             | AdminEvents(-Empty), AdminMobile                               |
| EditFormLayout (main + sticky aside), FormSection, SaveBar (no changes / unsaved / saving / published-edited), PublishErrorSummary                                                                                                    | AdminEventEdit, AdminEditStates                                |
| LocalizedField (MK / EN tabs, MK required), SlugField, DateTimeField, ChipMultiSelect, SortableList (dnd-kit), RichTextEditor (Tiptap), ImageField (cover + alt + credit), GalleryField (multi-upload, reorder, alt check), FileField | AdminEventEdit, AdminSettings                                  |
| AdminDialog (shared layout), ConfirmDeleteDialog (type DELETE), RejectDialog (presets, reason, e-mail switch), UnsavedChangesDialog                                                                                                   | AdminDialogs                                                   |
| StatCard, ActivityFeed, ApprovalSplitView, MobileDecisionBar, InboxSplitView, ExportPopover, NotesPanelView, RatingBars                                                                                                               | AdminDashboard, AdminApprovals, AdminInbox, AdminIdeas-Ratings |

**Domain components** live in their feature but are reused everywhere through its public entry ("one component per thing"):

| Component                  | Feature      |
| -------------------------- | ------------ |
| EventCard                  | events       |
| MemoryCard                 | memories     |
| MemberCard                 | members      |
| ApplyBox, ApplicationForm  | applications |
| JourneyStep                | journey      |
| PartnerLogo / PartnerLogos | partners     |
| CommitteeMap               | committees   |
| JoinForm                   | join         |
| CompanyForm                | partners     |
| ContactForm                | contact      |
| AuthForm                   | auth         |
| SubmitForm                 | ideas        |

**Normalisation rules** (the canvas is inconsistent; one rule each, applied in `/design-system`):

- **Radii:** 8 / 12 / 16 / full only. The canvas's 10 → 12 and 14 → 16.
- **Buttons:** one disabled style.
- **Countdown:** one component.
- **Status labels:** one map, used everywhere.
- **Form states:** one vocabulary (`idle · sending · success · error · limited · closed`).
- **Spam protection:** honeypot + time check on **every** public form; the canvas shows it only on /submit.
- **Off-token neutrals:**
  - `#d0d0d0`, `#e6e6e6` and `#e9e9e9` map to the nearest token (D10, no palette change).
  - The Lightbox and map dark greys map to `--color-text` / `--color-text-2`.

---

## 6. Tooling

- **TypeScript:**
  - Enabled: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`.
  - Path alias `@/*` → `src/*`.
  - Typed routes and Next 16 `PageProps` helpers.
- **ESLint 9 (flat config):**
  - Base configs:
    - `eslint-config-next` (core-web-vitals + typescript).
    - `typescript-eslint` recommended-type-checked, plus `no-floating-promises`, `no-misused-promises`, `consistent-type-imports` and `switch-exhaustiveness-check`.
    - `jsx-a11y`.
  - **`eslint-plugin-boundaries` v7** (`boundaries/dependencies` rule, with the TypeScript resolver):
    - `shared` may import `shared` only.
    - A feature may import itself, `shared`, and other features' `index` / `server` only.
    - A feature's admin components may also import other features' `admin.ts`.
    - `app/admin` may import `admin.ts`; `app/[locale]` may not.
    - Nothing imports `app`.
  - `no-restricted-imports` bans `next/link` and `next/navigation` redirects in public code (use the locale-aware ones) and raw `<img>`.
  - `import-x/no-cycle` keeps the feature graph acyclic.
  - `i18next/no-literal-string` (JSX text only) in `features/` and `shared/layout` blocks hard-coded UI copy.
  - `eslint-plugin-better-tailwindcss` enforces the palette: `no-unknown-classes` flags classes that aren't in the theme, and `no-restricted-classes` bans arbitrary colour values like `text-[#…]`.
- **Prettier** with `prettier-plugin-tailwindcss` (class sorting). `.editorconfig`.
- **Tests:**
  - Vitest + Testing Library (jsdom).
  - Playwright (Chromium desktop + mobile viewport) with `@axe-core/playwright`.
  - Details in §8 / Verification.
- **Git:**
  - Conventional Commits; scopes are the feature names plus `ui`, `layout`, `i18n`, `config`, `deps`, `e2e`. Example: `feat(events): archive filters in URL`.
  - `commitlint` + `lefthook`:
    - pre-commit: Prettier + ESLint on staged files.
    - commit-msg: commitlint.
    - pre-push: typecheck + unit tests.
  - Branches `m<N>-<slug>`, squash merge, PR template checklist: screens compared at 375 / 1024 / 1440, every state covered, keyboard + axe, no hard-coded copy or content, i18n keys in both locales.
- **CI (GitHub Actions):** install (pnpm cache) → `next typegen` → typecheck → lint → format check → unit → `next build` **with an empty environment** → `scripts/check-i18n-keys` (MK / EN parity) → Playwright against `next start` (mock data, fixed clock).
  - The e2e job sets `FEATURE_FLAGS=phase2` explicitly, because `next build` / `next start` don't load `.env.development`.
  - Vercel preview per PR, production from `main`.
  - Dependabot weekly, grouped.
- **Environment** (`shared/config/env.ts`, zod, everything optional with defaults):
  - `DATA_SOURCE` (mock)
  - `MOCK_NOW`, `MOCK_MULTIPLY`
  - `FEATURE_FLAGS`
  - `NEXT_PUBLIC_SITE_URL` (falls back to the Vercel URL / localhost)
  - Optional `TURNSTILE_*`
  - Supabase variables become **required only when** `DATA_SOURCE=supabase`.
  - Dev-only surfaces (`/design-system`, devtools, mock upload route) are gated on `VERCEL_ENV !== 'production'` plus local development, **not** on `NODE_ENV`, which is `production` on previews and under `next start` too.

---

## 7. State, forms, validation, i18n, images

**State:**

- **Server data:** RSC + queries, no client cache library.
- **Mutations:** Server Actions + `updateTag` / `revalidateTag`.
- **URL state (filters, tab, page):**
  - A zod schema per list with `.catch()` defaults, so invalid params fall back instead of crashing.
  - `buildHref()` drops default values for clean URLs.
  - Chips, tabs and page numbers are plain `<Link>`s that work without JS. Only the search box and selects are small client components (debounced `router.replace` + `useTransition`).
- **Client state:** local `useState` plus tiny contexts (mobile nav, lightbox, toasts). No global store.

**Caching and rendering (Next 16 Cache Components), with the rules that keep the build green:**

- **Cached queries.** Public queries use `'use cache'` + `cacheTag` + a **custom `cacheLife` profile**: `events` = `{ stale: 60, revalidate: 300, expire: 600 }`. The built-in `'minutes'` profile expires after an hour, which would break the decided "within 10 min" refresh.
- **Time.** Countdowns tick on the client. An uncached `new Date()` fails the build, so time is read only through `clock`, inside cached queries or dynamic code.
- **Static params.**
  - `[locale]/layout` exports `generateStaticParams` (`mk`, `en`). It is a root param, and the build fails without it.
  - Every dynamic page (`[slug]`, `[username]`) returns at least one param, including Phase 2 routes whose flag is off (placeholder param + `notFound()`).
- **No route-level `revalidate` / `dynamicParams` exports.** They are build errors under Cache Components.
- **Suspense.** Anything that reads cookies or headers sits inside `<Suspense>`: guards, the header account slot, members-only lists, the persona switcher. A `loading.tsx` does not wrap its own segment's layout, so guarded layouts get an explicit boundary. Client components that call `usePathname` (Header active pill, LocaleSwitcher) are wrapped too.
- **Admin** is fully dynamic.
- **Fallback.** If Cache Components causes friction, the fallback is switching it off globally, not per route.

**Security and SEO headers:**

- Static security headers are set in `next.config`: CSP allowing OSM tiles, YouTube / Vimeo embeds and Turnstile; `frame-ancestors 'none'`; `Referrer-Policy`; `Permissions-Policy`. A nonce-based CSP does not work with prerendered shells.
- `/admin` and `/design-system` send `noindex`.
- Both root layouts set `metadataBase`.

**Forms (one pattern everywhere):**

- **Contract:** a zod schema in `features/<x>/schemas/` is shared by client and server.
- **Client:** React Hook Form + `zodResolver` + shadcn `Field`, wrapped in `shared/forms/use-action-form`. It handles:
  - client validation;
  - submitting to a Server Action;
  - mapping server `fieldErrors` back onto fields;
  - focusing the ErrorSummary;
  - the `sending / success / limited` states.
- **Server:** `createAction({ schema, guard, handler })` re-validates, runs the permission guard (passed in from `auth`) and returns a typed `ActionResult`:
  - `ok`
  - `validation` + fieldErrors
  - `forbidden`
  - `rate_limited` + retryAt
  - `conflict`
  - `unexpected`
- **Public forms:**
  - `spamGuard` (honeypot + minimum fill time, Turnstile when keys exist).
  - Rate limit port (5 / hour on /submit).
  - Consent field required (on /submit only once an e-mail is entered).
  - Anonymous ideas drop name, e-mail and profile **before** they reach the repository.
- **Admin forms:**
  - Two schemas per entity: **draft** (lenient, "Save draft always works") and **publish** (strict, drives PublishErrorSummary).
  - `isDirty` drives the SaveBar and `useUnsavedChanges` (leave-page dialog).
  - The Memory editor uses `useAutosave` (10 s, offline copy in localStorage).
- **Event application form:** built at runtime from the event's form definition (`buildApplicationSchema(fields)`), so the form builder and validation share one source.

**i18n (next-intl):**

- **Routing:**
  - `locales: ['mk','en']`, `defaultLocale: 'mk'`, `localePrefix: 'as-needed'`.
  - `localeDetection: false` and `localeCookie: false`: no Accept-Language redirect, so crawlers and shared links are stable, and the URL is the only language state.
  - The locale-aware `Link` / `redirect` come from `shared/i18n/navigation`.
- **Request config:**
  - `request.ts` reads the locale from `next/root-params` (the Next 16.3 + next-intl 4 way; no legacy `setRequestLocale`).
  - On admin routes the root param is missing, so it falls back to `'en'`, not the default `mk`.
  - Server Actions can't read root params, so they return **message keys**, never translated text, and the client translates them.
- **UI strings:**
  - Nested JSON `shared/i18n/messages/{mk,en}.json`, namespaced per feature (`common`, `nav`, `forms`, `validation`, `events`, …, `admin`).
  - `en.json` is the typed key source (the design copy is English).
  - CI enforces MK / EN key parity. MK strings are drafted from the design copy and **need native review**.
  - Admin strings live in `admin.en.json`, loaded only by the admin root layout.
  - The client provider receives only the namespaces client components need (`pick`), not every message.
- **Board-editable content vs UI copy:**
  - Content comes from repositories, never from messages. The rule: if the board would want to change it, it is content.
  - Content is `Localized` (`mk` required, `en` optional). Read models resolve EN → MK per field, and fallback text renders with `lang="mk"`.
- **Formatting and SEO:**
  - Dates and numbers via next-intl formatters with `timeZone: 'Europe/Skopje'`, plus a shared `formatDateRange` ("7–13 Nov 2026").
  - hreflang alternates (mk, en, x-default) in `generateMetadata`; both locales in the sitemap.
  - Slugs are shared across locales.
- **Admin:** English-only UI (as designed). Strings still go through next-intl so the UI can be translated later; content fields use `LocalizedField`.
- **Font:** Roboto via `next/font/google` (self-hosted at build, no runtime Google request), weights 300 / 400 / 500 / 700, subsets **latin, latin-ext, cyrillic**.

**Images:**

- **Media type.** `Media` is a value object (`url, width, height, alt, credit?`) with `alt` required by type and by the upload schema. Decorative images must be explicitly `alt=""`.
- **Rendering.**
  - `MediaImage` wraps `next/image` with size presets (card, cover 21:9, gallery thumb, lightbox).
  - Images lazy-load by default; `priority` only for the hero / LCP cover.
  - Missing covers render the designed red + white-logo fallback.
  - Mock media render the canvas's labelled striped placeholder.
- **Partner logos** are sized by visual area: `w = √(area × ratio)`, clamped to 64 % of the cell height and to the cell width. This is a pure, unit-tested function in `partners/domain`.
- **Backend phase:**
  - Compress in the browser before upload.
  - Store dimensions and size on the `media` row.
  - `next/image` (or Supabase transforms; cost risk in §9) produces thumbnails.
  - `remotePatterns` comes from env.
- **Brand assets.** Logos move to `public/brand/`, and Settings › Branding can override them. Favicon and app icons are generated from `eestecredsquare.png`.

---

## 8. Implementation plan (milestones)

**Every milestone ends:**

- buildable with **no environment variables**;
- with typecheck, lint, unit and e2e green;
- with `/design-system` updated;
- with its screens compared side by side at 375 / 1024 / 1440 against the listed `handoff/screens`. The design source wins on conflicts.

**Order:**

- The order follows `handoff/README.md`. Each route goes end to end (data → admin → public page → states) before the next.
- Phase 2 is built on mocks too; Supabase comes last.

**Phase 1 frontend**

| #   | Milestone               | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Check against                                                                                                           |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| M0  | Foundation              | Next 16 + Cache Components + TS strict + pnpm; Tailwind v4 theme from tokens; shadcn init (Radix, aliases into `shared/`); Roboto (latin + cyrillic); next-intl (mk default, `/en`, root params); proxy (i18n + admin branch); two root layouts + 404 / global error; security headers; env / flags / data-source / clock; ESLint boundaries (a deliberate deep import fails), Prettier, Vitest, Playwright, lefthook, commitlint, CI, Vercel project; update CLAUDE.md | `pnpm build` with empty env; `/` and `/en` render; unknown URL → designed 404; CI green                                 |
| M1  | Design system           | primitives restyled + brand composites + form kit; `/design-system` mirrors the canvas Main frame                                                                                                                                                                                                                                                                                                                                                                       | 01-Main, 01-Main-Continued                                                                                              |
| M2  | Site chrome             | `settings` feature (mock); Header (all variants, MK / EN switcher, flags), Footer, PageHeader, 404 / error, `/privacy`; `auth` personas + devtools; sample-data ribbon                                                                                                                                                                                                                                                                                                  | 01-Header, 07-HeaderStates, 01-Footer                                                                                   |
| M3a | Admin foundation        | admin root layout, `/admin/login` (sign-in, wrong password, lockout, not-staff, forgot, link sent, 2-step + backup code), permissions policy (D18, table tests), proxy redirect for visitors, AdminShell (sidebar / rail / drawer, topbar), dashboard (role-aware)                                                                                                                                                                                                      | 14-AdminLogin*, 14-AdminLoginStates, 14-AdminDashboard(-Tablet), 14-AdminMobileViews, 01-AdminSidebar / Topbar / Mobile |
| M3b | Admin patterns          | admin-ui patterns (DataTable, FilterBar, BulkBar, TablePagination, SaveBar, dialogs, toasts, LocalizedField) in the `/admin/design-system` lab; mock admin sign-in off on production (D19)                                                                                                                                                                                                                                                                              | 14-AdminEditStates, 14-AdminDialogs, 14-AdminEvents(-Empty), 14-AdminMobileViews › 3                                    |
| M4a | Media library           | `/admin/media` (grid, tabs, filters, details with alt text + credit, delete), two-step mock upload with alt text required, event managers: own uploads                                                                                                                                                                                                                                                                                                                  | no canvas frame: built from the M3b patterns                                                                            |
| M4b | Settings                | `/admin/settings` (all 8 sections; undrawn ones built from the same pattern), logos and share images from the Media library, `/admin/activity` (read-only for editors)                                                                                                                                                                                                                                                                                                  | 14-AdminSettings                                                                                                        |
| M4c | Admin users             | `/admin/users` + invite + role change + the D18 matrix rendered from code                                                                                                                                                                                                                                                                                                                                                                                               | 14-AdminUsers, 14-AdminDialogs › 4                                                                                      |
| M5  | Events — admin          | events list (tabs, filters, bulk, pages, empty), edit form (all field types, gallery, rich text, SEO, draft / publish schemas), event types                                                                                                                                                                                                                                                                                                                             | 14-AdminEvents(-Empty), 14-AdminEventEdit                                                                               |
| M6  | Events — public         | `/events` (tabs, chips, year, search, sort, pages, empty, loading, mobile sheet), `/events/[slug]` (full / minimal / ended, gallery, lightbox, video, prev / next)                                                                                                                                                                                                                                                                                                      | 01-EventCard, 03-_, 04-_, 06-EventDetail-Ended*                                                                         |
| M7  | Upcoming + applications | `/upcoming`, `/upcoming/[slug]`, ApplyBox (all states), countdowns, .ics + Google link, sticky mobile bar, dynamic application form, waitlist, external link, ended → 301 in proxy; admin applications list, statuses, CSV, form builder                                                                                                                                                                                                                                | 05-_, 06-UpcomingDetail_, 06-UpcomingStates, 01-ApplyBox                                                                |
| M8  | Home + committees       | all Home sections in configured order, timeline, animated stats, Leaflet map (filters, popup, legend), weekly meeting, latest events, journey teaser, partner strip; `/admin/pages/home`, `/admin/pages/map`                                                                                                                                                                                                                                                            | 02-*, 01-CommitteeMap                                                                                                   |
| M9  | Journey                 | page, steps (hover / expand rules, one open on mobile, reduced motion), quotes, CTA; `/admin/pages/journey`                                                                                                                                                                                                                                                                                                                                                             | 10-*, 01-JourneyStep                                                                                                    |
| M10 | Join Us                 | page, sub-nav scroll-spy, FAQ, documents, JoinForm (all states incl. closed); `/admin/pages/join`                                                                                                                                                                                                                                                                                                                                                                       | 11-*, 01-JoinForm                                                                                                       |
| M11 | For Companies           | benefits, packages, logo wall, past partners, PDF, CompanyForm; sponsors / tiers / packages admin                                                                                                                                                                                                                                                                                                                                                                       | 12-*, 01-PartnerLogo(s), 01-CompanyForm                                                                                 |
| M12 | Contact + Inbox         | contact page, subject routing, copy buttons, map; `/admin/pages/contact`; `/admin/inbox` (3 tabs, read / unread, status, notes, CSV popover)                                                                                                                                                                                                                                                                                                                            | 13-*, 01-ContactForm, 14-AdminInbox                                                                                     |
| M13 | Phase 1 hardening       | metadata + OG per page from settings, sitemap / robots / hreflang, JSON-LD for events, axe 0 serious, keyboard pass, Lighthouse ≥ 90 (mobile), image budgets, MK copy review                                                                                                                                                                                                                                                                                            | Lighthouse + axe reports                                                                                                |

**Phase 2 frontend (on mocks)**

| #   | Milestone      | Scope                                                                                                                                                                  | Check against                                                          |
| --- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| M14 | Member auth    | login / register / forgot / reset / confirm / pending / expired, header account states; `/admin/approvals?type=members`                                                | 07-AuthPage*, 07-AuthStates, 01-AuthForm                               |
| M15 | Members        | `/members` (board per mandate, active, alumni, members-only rules), `/members/[username]` (+ restricted); `/admin/members` (teams, roles, board, badges, alumni)       | 07-MembersPage*, 07-MemberProfile*, 01-MemberCard, 07-MemberCardStates |
| M16 | My profile     | profile + save bar, visibility, my applications, my Memories, consents + CV flow, account, delete dialog                                                               | 07-MyProfile*, 07-MyProfileStates                                      |
| M17 | Memories       | list (cards), post (former / preview / changes waiting), lightbox, editor (autosave, errors, rejected, live edit), approvals › memories + revisions, `/admin/memories` | 08-*, 14-AdminApprovals                                                |
| M18 | Submit + Ideas | `/submit` (both tabs, all states, rate limit, anonymous), `/admin/ideas` (ideas, feedback, ratings, form settings)                                                     | 09-*, 01-SubmitForm                                                    |

**Backend (Supabase last)**

| #   | Milestone     | Scope                                                                                                                                                                                                                     |
| --- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M19 | Schema        | review `schema.sql` against this doc (localized jsonb, §9 fixes), migrations, RLS on every table + policy tests, storage buckets, generated types, `seed.sql` generated from fixtures (sample rows flagged and purgeable) |
| M20 | Repositories  | `*.supabase.ts` per feature, one PR each, contract suite green against local Supabase in CI; flip `DATA_SOURCE` on preview                                                                                                |
| M21 | Auth          | Supabase Auth (members + admins), MFA for super admins, lockout, invites, reset (30 min) / confirm (24 h) expiry, role claims                                                                                             |
| M22 | Jobs & e-mail | Edge Functions + cron (revalidate, close, cleanup, retention), transactional e-mails, CV deletion on opt-out                                                                                                              |
| M23 | Launch        | Phase 1 flags in production, content entry by the board, purge sample data, go live; then enable Phase 2                                                                                                                  |

---

## 9. Decisions, risks

**Resolved decisions (approved 2026-10-05)** — these override the handoff where they differ.

| #   | Topic                            | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `auto_archive_events`            | Dropped. Upcoming / past is always computed from the end date. Replaced by the setting **"Auto-close applications at the deadline"** (Settings › Events, default on).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D2  | Approvals scope                  | Members + Memories (+ Memory revisions) only. Event applications are handled in `/admin/applications`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D3  | Permissions matrix               | Corrected matrix implemented in `auth/domain/permissions.ts` and shown to the user in M3 (no "ideas" in Approvals, no inbox access for event managers, rows added for Ideas, Memories, Activity log).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D4  | Admin URLs                       | `routes.md` wins: page editors live at `/admin/pages/{home,map,journey,join,sponsors,contact}`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D5  | Topbar ⌘K search + notifications | Hidden at launch behind the `adminSearch` / `adminNotifications` flags.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D6  | Data-model fixes                 | Accepted: `partner_inquiries.interests text[]`, a `reference` column on every form submission (`MSG-…`, `PRT-…`, application refs), and the missing event fields (city, country, agenda, requirements, fee, partners, external URL, organized-by-LC, SEO).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D7  | Status label                     | Display **"Closing soon"** (MK: **"Се затвора наскоро"**); the code key stays `deadline_soon`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D8  | Language                         | MK default, EN secondary (see Context). Canvas frames are checked for layout; copy comes from the message files. Layouts must tolerate longer Macedonian labels.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D9  | CV sharing                       | **No partner accounts.** Board-mediated: admins export the CVs of members who opted in, for Main-package partners only, and every export is logged (who, when, which partner, which profiles). Build the member opt-in UI and the admin export; no partner login. `cv_access_log` becomes `cv_export_log`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D10 | Off-token greys                  | Mapped to the nearest existing token. No palette changes. Lightbox / map dark greys map to `--color-text` / `--color-text-2`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D11 | Waitlist off + full              | Built from the ApplyBox pattern: badge "Full", disabled button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D12 | 2-step login                     | No trusted devices. Super admins always get the 2-step step. The "Trust this device" checkbox is not built.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| D13 | Admin UI language                | English for now.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D14 | MK copy                          | Drafted by Claude, reviewed by the user. Every drafted MK string file carries a "needs review" note, and `docs/i18n-review.md` lists what still needs review. Sample content stays English until the board supplies Macedonian.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D15 | Committee map data               | Manual list in the admin (`/admin/pages/map`); no eestec.net API.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| D16 | Contact map                      | Reuses the same Leaflet map component with one pin (no static image).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D17 | Board open points                | `/privacy` is built with placeholder text that is clearly marked as placeholder. The e-mail retention period is an admin setting, default 12 months.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| D18 | Permissions matrix               | Approved 2026-10-05. Super admin: everything. Editor: everything except Settings and Admin users; Activity log read-only (`/admin/activity`). Event manager: dashboard, events, applications and form builder for **assigned events only** (edit, save draft, publish; no create, delete or reassign), media (own uploads), Ideas & Feedback **read-only Event feedback and Ratings for their events**. Member: no admin access. 2-step login required for super admins, optional otherwise. Source of truth: `src/features/auth/domain/permissions.ts` (table-tested).                                                                                                                                                                                                                                                                      |
| D19 | Mock admin sign-in in production | Given 2026-10-05. With `DATA_SOURCE=mock` on `VERCEL_ENV=production`, `/admin/login` shows “Admin not available yet”, every sign-in and 2-step attempt is rejected, and mock session cookies are ignored. Local development and preview deployments keep the mock sign-in. Source: `src/features/auth/availability.ts`; tested in `auth.mock.test.ts` and `e2e/admin-production.spec.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D20 | M4b follow-ups                   | Confirmed 2026-10-05: no on/off switch for English; security values (2-step, lockout, link expiry) stay read-only in Settings; the site name is one Latin-script value ("EESTEC LC Skopje") in both languages; keep the Meeting place and social links fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D21 | Event fields and cover (M5)      | Confirmed 2026-10-05: City and Country stay separate fields next to Location (cards show the city). The short description is required to publish. The cover image is optional: publishing without one shows the warning “This event will use the default red cover” and the public card and page use the designed red + white-logo fallback. A chosen cover (and every gallery photo) still needs alt text. Source: `publishIssues` / `publishWarnings` in `src/features/events/schemas/event.schema.ts` (used by bulk Publish / Hide and the edit form).                                                                                                                                                                                                                                                                                    |
| D22 | Admission per event (M7)         | Confirmed 2026-10-06 after M7a: places = **accepted** applications. Each event has the setting **Admission: Selection (board accepts) / First come, first served**, default Selection. Selection: applications stay pending until the board accepts them; once the accepted ones fill the places, new ones join the waitlist. First come: each new application is accepted at once until the places are full, then the waitlist starts; while anyone is waiting, a freed place goes to the waitlist, not to a newcomer. Also confirmed: applications and the waitlist close at the deadline; cards say "Applications"; the confirmation uses the shared red check. Source: `submit` in `features/applications/data`, `applicationState` in `features/applications/domain/application-state.ts`, the Admission radios in the event edit form. |

**Notes from building (M1)**

- `cn()` extends tailwind-merge with our theme scales; without it `text-body` (size) and `text-white` (colour) were merged away.
- Secondary / inverse buttons use `#b81f24` text (the canvas draws `#e52a30`): CLAUDE.md's "red text under 24 px is `#b81f24`" wins.
- White text on brand red is 4.46:1 (WCAG AA wants 4.5:1 for text under 18.66 px bold / 24 px). The canvas accepts it explicitly for Roboto 500/700 ≥ 14 px; the e2e axe check ignores exactly that pair and nothing else.
- `/design-system` is prerendered, so its gate is read at build time; `ENABLE_DEV_SURFACES=true` turns it on for `next build` + `next start` (e2e builds with it).

**Notes from building (M2)**

- Header: the full menu starts at **1280 px** (hamburger below). With 8 items and Macedonian labels it overflows at 1024 px by ~75 px; the canvas collapses only under 1024. At 1280 MK fits exactly, so new nav items need a re-check.
- No `<Suspense>` around `usePathname` in the header: on our static / `generateStaticParams` routes it resolves at prerender, and a boundary made Next defer the whole header (fallback flash). Routes with unknown dynamic params would fail the build loudly, which is the signal to revisit.
- Active nav pill and the language switch use `#b81f24` text on white (red text under 24 px rule), not the canvas `#e52a30`.
- The header account slot reads the session through a promise resolved in `<Suspense>`, so pages stay prerendered; Phase 1 passes no promise at all (no "Log in").

**Notes from building (M3a)**

- Sidebar breakpoints: wide from 1280 px (collapsible, remembered per browser), icon rail 768–1279 px, drawer below. Built as our own component instead of shadcn's Sidebar: the canvas sidebar is simple, and restyling shadcn's would cost more than it saves.
- The proxy sends requests without any session cookie on `/admin/*` to `/admin/login` with a real 307 (a redirect inside the streamed layout is client-side only). Role checks stay in `requireStaff()` / `requirePermission()`.
- Dates use `shared/i18n/format.ts` (EN → en-GB day-month order like the canvas, MK → mk-MK, Skopje time zone), not next-intl's `en` (US order).
- Dashboard numbers are sample data from one consistent fixture until each source feature lands; they differ from the canvas's illustrative numbers (Approvals 7 = 3 registrations + 4 Memories, D2).
- Mock admin sign-in: test values `SAMPLE_PASSWORD`, `SAMPLE_TOTP_CODE`, `SAMPLE_BACKUP_CODE` in `src/features/auth/data/fixtures/personas.ts`.

**Notes from building (M3b)**

- No TanStack Table: sorting, filtering and paging happen on the server from the URL, so `DataTable` is a plain table with column definitions, row selection (kept per page of rows), a bulk bar, a row menu and cards below 768 px. Feature tables are client components that pass `cell` functions.
- The admin patterns lab is `/admin/design-system` (inside the admin shell, so it gets the compact density, the English admin strings and the sticky top bar), gated like `/design-system`. `/design-system` links to it.
- `FormDialog` dropped: `AdminDialog` is the shared layout; the invite dialog (M4) is built on it.
- `useUnsavedChanges` intercepts in-app links and tab close / reload; the browser back button can't be blocked reliably in the App Router and is not covered.
- Off-token canvas values mapped to tokens (D8): selected row `#fdf6f6` → `brand-tint/60`, segment border `#d0d0d0` → `line-strong`, disabled `#f0f0f0` → `surface` (one disabled style for quiet and ghost buttons). Inner radii 6 / 10 / 14 → 8 / 12 / 16.
- e2e starts a second server from the same build with `VERCEL_ENV=production` (port 3101) for gates read at request time.

**Notes from building (M4a)**

- M4 split in three (media → settings → users): the Settings logos and SEO share images need uploads, so the Media library comes first.
- Uploads: `startMediaUpload` reserves an upload and returns a URL, the browser `PUT`s the file there, `finishMediaUpload` records it with its alt text. On mocks the URL is `/api/dev-uploads/[id]` (in-memory, needs a signed-in admin, off on production like D19); on Supabase it becomes a signed Storage URL. In-memory files live per server instance, so on Vercel previews an upload can land on another instance than the page.
- Alt text: images need alt text or an explicit "Decorative" (stored as `alt=""`); `null` = still missing (shown as "No alt text"). The server checks this against the stored file type, never a flag from the browser.
- Admin thumbnails are not optimized (`unoptimized`): SVG logos can't be, and previews are small. Public pages optimize through `MediaImage`.
- Server Actions check permissions with `authorize()` (returns `forbidden` instead of redirecting) and call `refresh()` after a change (admin pages are uncached).

**Notes from building (M4b)**

- `activity` owns the log (dashboard feed, Settings › Activity log, `/admin/activity`). Entries are structured (actor, action, area, target) and rendered from `admin.activity.actions.*`. On mocks the Server Actions write them (`recordActivity`); in the backend phase database triggers do, and `record()` becomes a no-op.
- Settings is one form with one "Save changes" (as on the canvas), validated by one zod schema with message keys. A save names the changed sections in the log ("edited Settings › Events, SEO") and calls `updateTag('settings')`, so the public site shows it on the next request.
- Logos and share images are picked from the Media library (`MediaPicker`; only images with a file and alt text). The header and footer use the white logo from Settings, the favicon follows Settings › Icon, and the title suffix is " · <site name>". The site name is one value (Latin script, as on the logo), so the drafted Cyrillic MK title strings were removed.
- Public pages get title, description and share image from `pageMetadata(page, locale)` (Home and Privacy now; each page as it is built).
- Undrawn sections: E-mail notifications are editable (on/off + recipients per kind; Phase 2 kinds behind the flag). Languages and Security & backups show the decided rules read-only (MK default with EN fallback; 2-step for super admins; 5 tries / 15 minutes; link expiry; backups). Lockout and link expiry belong to the auth backend. Only the retention period is editable there (D17).
- Not on the canvas, added to keep content out of code: a "Meeting place" field for the weekly meeting, and the social links in Contact & legal (an empty link is hidden on the site).
- `SortableList` (dnd-kit) reorders with mouse, touch or keyboard (Space, arrows, Space), with screen-reader announcements; reused later for galleries, Home sections and sponsors.
- Mock repositories compare times with `Date.parse`, never as strings (fixtures mix `+02:00` and `Z`).

**Notes from building (M4c)**

- Accounts (roles, managed events, 2-step status, invites, last active) live in the `auth` data layer, the single source for sessions and Admin users: a role change applies on that person's next request. `admin-users` is the screen and its actions, on top of `auth/server` (no feature cycle).
- Rules (pure, tested): nobody changes or removes their own access; at least one active super admin stays; event managers manage at least one event; leaving event manager clears the events; an invite to a member's e-mail gives the role on their own account.
- The Roles & permissions table is rendered from `PERMISSIONS` (D18), so it can't drift from what the admin enforces.
- A minimal `events` feature (sample event list from AdminEvents) provides "Events they manage"; M5 builds the full events feature on it.
- Canvas contradictions resolved: Daniel manages Leading Teams and FPGA Basics (AdminUsers); the "Marija Stojanovska · Editor" row is left out, because Marija is the member-only sample persona everywhere else.
- English dates use three-letter months ("30 Sep"): newer ICU writes "Sept" in en-GB.

**Notes from building (M5a)**

- M5 split in two: M5a is the events data model, the list and Event types & topics; M5b is the edit form (`/admin/events/new` and `/[id]`). "View on site" arrives with the public pages (M6).
- One `EventRecord` holds every field the public pages need (D6): location plus a short city for cards and a country, organizer (`null` = LC Skopje, which drives the "Organized by LC Skopje" badge), agenda as dated items (UpcomingDetail draws a day-by-day programme, not free text), requirements as rich text, fee as price + note, contact e-mail, participant and country counts, and the application settings incl. "Results by". Event partners come with sponsors (M11).
- Images used by an event keep their own alt text and credit (`cover_alt`, gallery captions in `schema.sql`); the file stays in the Media library. A gallery photo or cover without alt text blocks publishing; no cover at all is allowed (D21).
- Publish rules are one pure function (`publishIssues`) used by bulk Publish now and by the edit form in M5b. Bulk Publish skips events that aren't ready and names them.
- Event types and topics are `Localized` lists with an order. Deleting a type that events use asks for the type they get instead; deleting a topic takes it off its events.
- Applications column: sample counts from AdminEvents / AdminDashboard until the applications feature (M7).
- Sample data: 23 events from the canvas in one dataset (contradictions are listed at the top of `events/data/fixtures/events.ts`). Some published archive samples have no short description because the canvas never gives one; the edit form asks for it before "Update live page". A missing cover is only a warning (D21).
- Export CSV is `/api/export/[resource]` (events now, applications in M7): the current filters, BOM for Excel, formula-safe cells, logged in the activity log.

**Notes from building (M5b)**

- One Server Action (`saveEvent`) serves both buttons. "Save draft" uses the lenient schema and makes the event a draft. "Publish" / "Update live page" checks `publishIssues` and saves with the status chosen under Publishing: published, or hidden (by link only). Choosing Draft there unpublishes. Hidden events are on the site, so they need the publish rules too (bulk Hide as well).
- Rich text is Tiptap (headings 2–3, bold, italic, links, lists, quote, images from the Media library, undo / redo, word count). The server cleans it with `sanitize-html` before validating (`shared/lib/sanitize-html.ts`; to be used again when the public pages render it). Toolbar clicks keep the caret in the text.
- Dates and times are Skopje wall-clock values in native date / time inputs, converted with `shared/lib/zoned-time.ts` (Intl, incl. summer time). All-day events run 00:00–23:59. New events start as a draft for tomorrow 10:00–18:00, because dates are required even for drafts. Their application defaults come from Settings › Events.
- New events take their address from the title (transliterated, `-2` when taken) until it's edited by hand. A live address never changes by itself.
- Gallery uploads go up several at a time with progress and cancel, using XHR because fetch can't report upload progress. The alt text is written on the event, so the library keeps such photos as "No alt text" (`altLater`). The cover and the gallery can also pick from the Media library, sample placeholders included. The info pack picks a PDF from the library.
- Next 16 keeps the previous page mounted (hidden) for back / forward. So field ids include the event id (`e-<id>-<path>`), and the `/new` form resets itself after creating an event instead of turning into it. Error-summary links now move focus to the field.
- Not built yet: Preview (needs the public pages, M6), Crop (needs real image processing, backend phase), "Edit application form" (built in M7c) and event partners (M11). The aside isn't sticky, because with Applications open it is taller than a laptop screen.
- `SettingsPanel` / `SwitchRow` moved to `shared/admin-ui/form-section.tsx` (`FormSection`, `SwitchRow`, `EditFormLayout`). The admin lab shows the new field patterns.

**Notes from building (M6)**

- `/events` lists past events that are **listed**: published, and past their "Publish on". Hidden events open by link only; drafts are 404.
  - Tabs are Local / International (no "All", as on the canvas).
  - Type chips use a slug of the type's Macedonian name (`?type=competition`), so URLs are the same in both languages.
  - The page header is prerendered; the list reads the URL inside `<Suspense>` behind the designed loading state.
  - On phones, type and year sit in a bottom sheet. Its chips are links, so the results and "Show N events" update behind it.
- Public reads go through `features/events/public-queries.ts` (`'use cache'`, tag `events` / `event:<slug>`, `cacheLife('events')`). Every admin save already calls `updateTag`.
  - Write models map to read models in one shared, pure place (`domain/public-event.ts`), so Supabase will render the same.
  - Images without alt text never reach a public page.
- Event page:
  - The description's first heading becomes the section title ("About the workshop" / "About the lecture"). That is how the canvas content is written.
  - Mobile shows the same description as desktop (the canvas has a separate shorter text; one content, D8).
  - The video loads only when played (privacy-enhanced YouTube / Vimeo; no request before).
  - The info pack is a download button in the details panel.
  - Previous / next follow the archive by start date across both categories. The newest one links to Upcoming.
  - "Just ended" (Settings › Events days) shows the ended box. Its "Share your impression" button, and "Were you there?", only show with Phase 2.
  - Event partners arrive with sponsors (M11), Memories from this event with M17.
- An event that hasn't ended redirects from `/events/<slug>` to `/upcoming/<slug>` (built in M7). Old addresses of published events are a real 301 in the proxy (only for `/events/<slug>` paths; `resolveEventAddress` since M7a).
- Next 16 keeps hidden copies of previous pages mounted, so e2e tests target visible elements and regions.
- The events repository now has 15 methods (past the "about a dozen" in §4.1). It is split into public and admin interfaces when M7 adds the upcoming list.
- Off-token lightbox greys (#141414, #2a2a2a) map to `--color-ink` / `--color-ink-2` (D10).

**Notes from building (M7a)**

- M7 is split in three: M7a is the public side (`/upcoming`, the event page, ApplyBox, the application form, calendar, redirects); M7b the admin applications (list, statuses, CSV, real counts in Events and the dashboard, admission D22); M7c the form builder.
- The events repository is split into `EventsPublicRepository` and `EventsAdminRepository` (one mock implements both). Public reads use the cookie-less `public` scope.
- Proxy redirects for `/(en/)?(events|upcoming)/:slug` use one lookup, `resolveEventAddress` (current slug + upcoming / past):
  - old addresses and ended upcoming events → 301;
  - an event that hasn't ended, opened under `/events` → 307 to `/upcoming` (it moves back by itself later, so not permanent).
  - **Flagged in M0:** the plan was to read the sample files in the proxy, because the Next 16 docs say the proxy shouldn't rely on shared globals. It reads the in-memory sample store through the repository instead (since M6). `next dev` / `next start` run the proxy in the same process, so admin renames redirect at once (e2e proves it). In production on sample data the admin is off (D19), so the store equals the files. On preview deployments the proxy may not see an admin edit made on another instance. With Supabase it is one indexed database read, which the docs allow.
- Applications feature (`features/applications`): form definitions, applications, places. It depends on events; the upcoming list and the event page are composed here (`UpcomingList`, `UpcomingEventPage`), with the event layout from events (`UpcomingEventDetail`, slots for the box, the form and the bar).
- Application state (`domain/application-state.ts`, table-tested): `off | opening_soon | open | deadline_soon | closed | full_waitlist | full`. External applications (eestec.net) are a channel, not a state: they go through the same dates and are never full.
  - Places taken = **accepted** applications (AI at the Edge has 38 applications for 24 places and is open; FPGA Basics is 20 accepted + 7 on the waitlist). When they fill the places, new applications join the waitlist with a position, or are refused without one (D11). The repository decides this in one step.
  - Applications close at the deadline (decided rule), or when the event starts if there is no deadline. With "Auto-close" off they stay open after the deadline until the event starts ("late applications").
  - The waitlist closes with the applications. The canvas footnote "Waitlist closes when the event starts" became "The waitlist closes on <date>", because the decided rule closes the form at the deadline.
- Application form: built from the event's form definition (`buildApplicationSchema`), validated in the browser and again in the action, together with the spam guard (honeypot + 3 s fill time, `shared/forms/spam-guard.ts`), the event's state at that moment, and the CV's content (`%PDF`, max 5 MB; Server Actions accept 6 MB).
  - Events without their own form use the default fields: the example list of spec 03 with the UpcomingDetail labels. The form builder (M7b) edits them per event.
  - One application per e-mail per event. References are `AIE-2026-0042` (three letters of the address, the event year, a running number).
  - Confirmation e-mails are sent by the e-mail jobs (M22); the confirmation copy already says one is sent.
  - The confirmation uses the shared `FormSuccess` (red check, like every other form); UpcomingStates draws it dark.
- Sample applications are placeholders behind the canvas counts ("Sample applicant 07", example.com, no answers): the canvas gives numbers, never applicants.
- Card wording is generic: the canvas's "Sign-ups close in 71 days" (New Year Social) and "Registration opens 1 Feb 2027" (EESTech Challenge) belong to drafts and would need a per-event label; every card says "Applications".
- Countdowns: the server renders the state and the numbers at the cached moment; the browser ticks from there. A state change (open → closing soon → closed) appears within 10 minutes (`cacheLife('events')`), and the action re-checks before saving.
- Phones: the ApplyBox follows the header, and a sticky bar keeps the deadline and "Apply now" on screen until the form is in view. It sits at the end of the page, so it never covers the footer.
- `/upcoming/[slug]/calendar` serves the .ics file (UTC times, all-day events as dates); the Google Calendar link is built on the server.

**Notes from building (M7b)**

- `/admin/applications` lists the events whose form is on this site (external ones are left out): Upcoming / Past tabs, deadline, total with "N new", places (accepted / max), application state. Drafts are listed (marked "Draft") but not counted on the dashboard, because their form isn't on the site.
- `/admin/applications?event=<id>`: status tabs with counts, search (name, e-mail, reference), sort, pages, bulk Accept / Waitlist / Reject / Back to pending, and a detail panel (`&open=<id>`) with every answer and the CV. Opening an application marks it read ("new" = never opened; the 10 sample ones match the dashboard's "10 new").
- The waitlist keeps its order: new arrivals go last, leaving it closes the gap; the Waitlist tab sorts by position. More accepted than places is allowed (the board decides) and shows a warning above the list.
- First come (D22): accepted at once while places are free and nobody is waiting; a freed place does not go to a newcomer while people wait. There is no automatic promotion from the waitlist: the board accepts the next person.
- Status changes refresh the public places at once (`updateTag`), and are logged in the activity log, like exports.
- Export CSV: `/api/export/applications?event=` with the list's filters, one column per question (option labels, "Yes", file names), BOM for Excel. "E-mail accepted" opens the admin's mail app with the accepted in Bcc; sending from the site comes with the e-mail jobs (M22).
- CVs download through `/api/applications/files/<id>`, checked against the event of the application they were sent with (private bucket + signed links with Supabase).
- Counts across features without a cycle: events defines `ApplicationCountsLoader`; the admin routes pass in `applicationCounts` from applications (Events list, its CSV). The dashboard depends on applications directly (§3). The sample counts in the events fixtures are gone.
- Deleting an event leaves its applications in the mock store (they are no longer listed, since the lists start from events); in Supabase they go with it (`on delete cascade`). The delete dialog offers "Export the N applications first (CSV)".

**Notes from building (M7c)**

- Form builder at `/admin/applications/<event id>/form` (the canvas link uses the slug; ids are what every other admin route uses). Reached from the event edit form ("Edit application form · 8 questions →", saved events only) and from the event's applications page ("Edit form"). Event managers: their own events only (D18).
- Questions: short text (plain or phone), long text, choice (dropdown or buttons, 2–30 options, each in MK + optional EN), checkbox, file upload (PDF, 5 MB). Required switch, help text, placeholder, max characters; drag (or keyboard) to reorder; max 30 questions. Full name, e-mail and the consent box are always asked and not editable.
- The form is live when saved (the event page reads it at once, `updateTag`); there is no draft. "Back to the default questions" deletes the event's own form. An event shows "Default questions" until its form differs from the spec 03 list.
- Question keys (`q-a1b2c3`) are fixed when a question is added: answers are stored under them, so renaming never loses answers. The type of a saved question can't change once applications exist. Removing a question that was answered asks first; its answers stay in each application, shown under "Removed questions" (and are not in the CSV, which follows the current form).
- An optional dropdown starts on its first option (as the canvas "Dietary needs: None" does); the builder says so. Use buttons, make it required, or put "No preference" first.
- The admin shows each question's English label when there is one, else the Macedonian one (the admin UI is English; MK is the required language, D8).
- No preview of the public form yet: "View event page" opens it.

**Notes from building (M8a)**

- M8 is split in three: **M8a** committees and the map (this), **M8b** Home content and `/admin/pages/home`, **M8c** the public Home. The journey teaser and the partner strip are slots in M8c that stay hidden until M9 and M11 supply their data; the Memories row only shows with Phase 2 (M17).
- `shared/ui/map/leaflet-map.tsx` is the one map (the committee map now, Contact with one pin in M12, D16). Leaflet is imported in the browser only (`import('leaflet')` inside an effect), so the page renders a placeholder first and `pnpm build` needs nothing from the environment. Pins are styled `<div>` icons (no Leaflet marker images), the popup is our own React dialog positioned over the map, and the tile layer is greyscaled on the whole pane (per-tile filters leave seams).
- Tiles and attribution are one value in `shared/config/map.ts`; `next.config.ts` builds the CSP `img-src` from it, so swapping provider is one edit.
- Accessibility: the map is a named region; every pin is a button (Tab, Enter or Space opens it, focus moves into the popup, Escape closes it and returns to the pin; Leaflet's own Enter handling needs the old `keypress` event, so the pins handle the keys themselves); a "Skip the map" link jumps past 35 tab stops; the **List view** shows the same committees as text and is the phone fallback (no separate /committees page); axe passes in both views (e2e).
- Phones (map under 720 px wide): smaller pins, no popup; the selected committee shows as a card under the map (Home-Mobile), with a one-line legend.
- Countries are stored as ISO codes and named by `Intl.DisplayNames` **on the server**: the Macedonian names are not in every browser's data (the test browser lacked them), Node always has them. The city is board content in both languages (`city: Localized`); sample cities are the same in both until the board supplies Macedonian (D14).
- Exactly one committee is ours (`isHome`, the red pin). Marking another moves it; the one that is ours can't be un-marked or deleted until another is marked. CSV import never moves it.
- Name + country is unique. CSV import (`name, type, city, country, lat, lng, link`; comma or semicolon; decimal comma accepted; `type` LC / Observer / JLC; `country` as a name in English or Macedonian, or the two-letter code) is checked in the browser first: the dialog lists the rows that failed with the field and the reason, and imports the valid ones; the action checks again. Same name and country are updated, others are added; up to 500 rows. "Export CSV" writes the same columns, so an export can be edited and imported again.
- Sample data: the 34 canvas pins + LC Skopje (the filter counts "All · 35 / 23 / 8 / 4" match the canvas). The canvas draws pins on a picture and has no coordinates; real city coordinates are used. See `docs/sample-data.md` for what the board must replace before launch.
- The big Home numbers ("35 Local Committees", "21 Countries"…) are separate statistics edited in `/admin/pages/home` (M8b); the map and its filters count this list. The admin page says so.

**Working rules while building**

- Small milestones. After each one: stop, show what changed and how to check it, wait for "go".
- One conventional commit per milestone.
- If Cache Components causes real friction, raise it before switching it off.
- If something in this plan adds complexity without clear value, propose dropping it instead of building it.

**Risks**

- **Header width.** 8 nav items + MK / EN + Log in at 1024–1279 px, worse with longer Macedonian labels. Mitigation: verify in M2 and switch to the hamburger below 1280 if needed.
- **In-memory mocks on Vercel.** They live per instance and reset on cold start, so preview demos can show inconsistent writes. That is acceptable, and the sample-data ribbon makes it obvious.
- **Cache Components is still young and strict.**
  - The build-time rules are listed in §7.
  - Mitigation: a custom short `cacheLife` profile plus client countdowns.
  - Fallback: turning it off globally.
- **Bilingual content from day 1** roughly doubles admin form fields. `LocalizedField` keeps it one component, but board writing effort rises.
- **Vercel plan and costs.**
  - Hobby is for personal, non-commercial use. A non-profit is usually fine, but the site has sponsor packages and partner inquiries, so confirm the plan.
  - Hobby allows **one** team member, so several IT-team members can't share the project there.
  - Image optimization has quotas, and Supabase image transforms need Supabase Pro.
- **Lockout and rate limits** need persistent storage (tables in the backend phase). The mock is per instance.
- **OpenStreetMap tile usage policy** (attribution, fair use). Swap the tile provider if traffic grows.
- **Rich text from members** (Memories) must be sanitized on write and on render.
- **Canvas sample data contradictions** are resolved once in fixtures, so canvas numbers (e.g. "96 local events", "19 approvals") will not match exactly.
- **Long frontend-only stretch before Supabase.** Contract tests and typed write models keep the eventual swap mechanical. Schema decisions from §9 are folded into M19.

---

## Verification

**Per milestone:**

- `pnpm check` (typecheck + lint + format + unit).
- `pnpm build` with no `.env` files.
- `pnpm e2e` (route smoke at 375 / 1024 / 1440, form-state flows, persona-based admin flows, keyboard paths, axe scan with zero serious / critical issues).
- Open each new route in the browser pane next to its `handoff/screens/*.jpg`, at the listed viewport widths, with the mock clock pinned to the canvas moment.

**Contract safety:** every repository interface has a contract suite that runs against mocks now and against local Supabase in M20. Switching `DATA_SOURCE` must not change any e2e result.

**Visual regression:** Playwright `toHaveScreenshot` baselines for the `/design-system` sections only, approved once against the canvas and then guarded in CI. Pages are checked through e2e behaviour plus the manual side-by-side review.

**Next step after approval:**

- Write this document to `docs/ARCHITECTURE.md`. That is the only file written.
- Then wait for the go-ahead to start M0.
