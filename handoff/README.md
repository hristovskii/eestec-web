# eestec.mk · handoff to Claude Code — start here

This folder is everything needed to build eestec.mk from the approved design.

**Design canvas:** https://claude.ai/artifact/H1jMuaD7awBwja4VWuiNv4 (private; share it from its Share menu if someone else should see it). Section 0 on the canvas is the developer handoff; sections 1–14 follow the spec files 00–11.

## What's in here

| Path | What it is |
|---|---|
| `CLAUDE.md` | Project instructions for Claude Code. Copy it to the root of the code repository. |
| `docs/routes.md` | Every public, member and admin route, with its canvas frames and phase. |
| `docs/components.md` | Shared components, their variants and states. |
| `docs/rules-and-settings.md` | Phases, every rule we decided, admin settings, scheduled jobs and e-mails. |
| `docs/data-model.md` | Tables and fields per area, storage buckets. |
| `docs/tokens.css` | Colours, type, spacing, radii, shadows as CSS variables. |
| `docs/frames.md` | Index of all 126 canvas frames → screenshot + source file. |
| `supabase/schema.sql` | Draft Postgres schema with enums, constraints and RLS examples (parses cleanly; review before use). |
| `screens/` | A JPG of every frame, named `<section>-<frame>.jpg` in canvas order. |
| `design-source/` | The design files (`*.dc.html`, HTML + CSS + sample data) and `canvas.json`. `assets/README.md` maps image ids to files. |

The spec files (`00-…md` to `11-…md`) and logos (`LC_Skopje_red.png`, `LC_Skopje_white.png`, `eestecredsquare.png`) are in the parent folder.

## Suggested build order

**Phase 1 (launch)**
1. Repo setup: Next.js + Supabase, tokens, Roboto, i18n scaffold, `schema.sql` reviewed and migrated, storage buckets, seed data.
2. Shared components: Header, Footer, buttons, form fields + states, cards, section title, breadcrumbs, tabs, chips, page numbers, empty states, lightbox.
3. Admin shell: `/admin/login` (+ 2-step for super admins, lockout), roles, sidebar/top bar, dashboard, Settings, Admin users, Media library, activity log.
4. Events: admin list + edit form + gallery; `/events`, `/events/[slug]`; `/upcoming`, `/upcoming/[slug]` with applications, waitlist, form builder, external link, auto-close, 301 redirect, "Deadline soon" / "Just ended".
5. Home (all sections, committee map) and its admin editors.
6. Journey, Join Us (+ membership applications), For Companies (+ sponsors, tiers, inquiries), Contact (+ subject routing), Inbox with CSV export.
7. SEO per page, Open Graph images, sitemap, performance (image compression, thumbnails, lazy loading), accessibility pass.

**Phase 2 (members)**
8. Member auth: sign-up → confirm e-mail → board approval; log in; reset; header account menu; Approvals › Member registrations.
9. `/members`, `/members/[username]`, `/profile` (incl. CV opt-in and delete account).
10. Memories: editor, approval, revisions, `/memories`, `/memories/[slug]`, "changes waiting".
11. `/submit` + Admin › Ideas & Feedback (ratings per event, form settings, rate limit).

**After launch:** Memories map view, "Log in with eestec.net" (only if EESTEC International offers SSO), Macedonian content.

## First prompt for Claude Code

Open Claude Code in the new code repository, put the spec files in `specs/` and this folder in `handoff/`, copy `handoff/CLAUDE.md` to the repository root, then paste:

> Read CLAUDE.md, then handoff/README.md and the docs in handoff/docs. Set up the project for Phase 1, step 1 and 2 of the build order: Next.js (App Router, TypeScript) with Supabase, the design tokens from handoff/docs/tokens.css, Roboto, an i18n scaffold, and the shared components (Header with all its variants, Footer, buttons, form fields with all states, EventCard, section title, breadcrumbs, tabs, filter chips, page numbers, empty state, lightbox). Match handoff/screens and handoff/design-source exactly. Review handoff/supabase/schema.sql against the specs and propose a first migration, but ask me before running it. Show me a page that renders every shared component so I can compare it with the canvas.

Then continue step by step, one route at a time.

## Open points to confirm with the board
- Privacy policy text (`/privacy` is linked from every form but has no design or text yet).
- Real content for every placeholder: board roles and e-mails, legal info, sponsors, packages, timeline, numbers.
- Whether eestec.net offers an API for the committee map (otherwise the list is kept by hand in the admin).
- Retention period for e-mails sent with ideas and contact messages (the forms currently say 12 months).
