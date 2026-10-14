# eestec.mk

[![CI](https://github.com/hristovskii/eestec-web/actions/workflows/ci.yml/badge.svg)](https://github.com/hristovskii/eestec-web/actions/workflows/ci.yml)

Website of EESTEC LC Skopje: public site (Macedonian first, English under `/en`), member area and admin panel.
Next.js 16, TypeScript, Tailwind v4 + shadcn/ui, next-intl. Runs on sample data until Supabase is connected.

- Architecture, decisions and milestones: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Rules for working on the code: [`CLAUDE.md`](CLAUDE.md)
- Design handoff: [`handoff/README.md`](handoff/README.md)
- Sample content to replace before launch: [`docs/sample-data.md`](docs/sample-data.md) · Macedonian strings to review: [`docs/i18n-review.md`](docs/i18n-review.md)

**Status.** Phase 1 is built on mock data through M12: foundation, admin (media, settings, users, events, applications, Inbox), the public events, upcoming, Home, Journey, Join Us, For Companies and Contact pages and their admin editors. Next: M13 (Phase 1 hardening). Phase 2 (members, Memories, ideas) and the Supabase backend follow. Milestones and decisions: `docs/ARCHITECTURE.md` §8 and §9.

```bash
pnpm install
pnpm dev          # http://localhost:3000 · component lab at /design-system
pnpm check        # typecheck, lint, format, unit tests, i18n keys
pnpm build        # must pass with no environment variables
pnpm e2e          # Playwright (builds with the e2e flags first)
```

No environment variables are needed; see `.env.example` for the optional ones.
