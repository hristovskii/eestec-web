# eestec.mk

[![CI](https://github.com/hristovskii/eestec-web/actions/workflows/ci.yml/badge.svg)](https://github.com/hristovskii/eestec-web/actions/workflows/ci.yml)

Website of EESTEC LC Skopje: public site (Macedonian first, English under `/en`), member area and admin panel.
Next.js 16, TypeScript, Tailwind v4 + shadcn/ui, next-intl. Runs on sample data until Supabase is connected.

- Architecture, decisions and milestones: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Rules for working on the code: [`AGENTS.md`](AGENTS.md) (Codex and others) · [`CLAUDE.md`](CLAUDE.md) (Claude Code), the same rules
- **Where we are and what is left: [`docs/HANDOFF.md`](docs/HANDOFF.md)** · backend plan: [`docs/M19-backend-plan.md`](docs/M19-backend-plan.md)
- Design handoff: [`handoff/README.md`](handoff/README.md)
- Sample content to replace before launch: [`docs/sample-data.md`](docs/sample-data.md) · Macedonian strings to review: [`docs/i18n-review.md`](docs/i18n-review.md)

**Status.** Phase 1 and Phase 2 are built on mock data (M0–M18): foundation, the admin (media, settings, users, events, applications, Inbox, members, Memories, ideas) and every public page, hardened for SEO, accessibility and performance (`docs/reports/lighthouse.md`). The Supabase backend is in progress: M19a (identity and people schema, row-level security, pgTAP) is merged; site content, member content, storage and the seed (M19b–d) come next, then the repositories (M20), auth (M21), jobs and e-mail (M22) and launch (M23). Details: `docs/HANDOFF.md`, `docs/ARCHITECTURE.md` §8 and §9.

```bash
pnpm install
pnpm dev          # http://localhost:3000 · component lab at /design-system
pnpm check        # typecheck, lint, format, unit tests, i18n keys
pnpm build        # must pass with no environment variables
pnpm e2e          # Playwright (builds with the e2e flags first)
pnpm lighthouse   # Lighthouse (mobile) on the production build; see docs/ARCHITECTURE.md, M13d
pnpm db:start     # local Supabase (needs Docker); then db:reset, db:test, db:lint, db:stop
```

No environment variables are needed; see `.env.example` for the optional ones.
