# supabase/: conventions for migrations and tests

The migrations are the source of truth for the schema (`handoff/supabase/schema.sql` is the superseded pre-M1 draft). The plan and the
research behind it: `docs/M19-backend-plan.md`. Status and what is left: `docs/HANDOFF.md`.

## Run it

```bash
pnpm db:start   # local Supabase (db, auth, storage only), needs Docker
pnpm db:reset   # drop and re-apply every migration and supabase/seed.sql
pnpm db:types   # regenerate src/shared/data/supabase/database.types.ts (CI fails on a diff)
pnpm db:test    # pgTAP: supabase/tests/database/*.test.sql
pnpm db:lint    # plpgsql_check: must report no errors
```

CI job `supabase` runs reset, test, both concurrency scripts (`supabase/tests/*-concurrency.sh`), lint and the types diff on every PR. `pnpm build` and the app do not need the database yet.

## Migrations

- Files: `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`, applied in name order. Existing: `20261110000001_foundation` to
  `…0014_m19b_fixes` (see the list in the folder). New ones continue after the highest timestamp (`20261110000015_…`).
- **Never edit a migration that is on `main`**: add a new one. (Before a milestone's PR merges you may still edit its own files.)
- One concern per file; comments say why (decisions, D-numbers). Keep the "DECIDED" rules (statuses, 5 fails → 15 min, …).

## Rules every migration follows

1. `alter table … enable row level security` for every new table, in the same migration. A pgTAP test (`00_rls_everywhere`) fails
   otherwise. **No policy = no access.**
2. **Nothing is granted by default** (default privileges of `anon`/`authenticated` were revoked in migration 1). After creating a table
   or function, `grant` exactly what is needed (`select` to `anon, authenticated` for public lists; column-level `grant update (…)`
   for self-edit; RPCs to `authenticated` or `service_role`). Server-only tables (`auth_links`, `login_lockouts`, `mfa_backup_codes`,
   `storage_cleanup_queue`) have no grant for `anon`/`authenticated`.
3. Helpers and RPCs: `security definer`, `set search_path = ''`, every name schema-qualified (`public.x`, `auth.users`), use
   `(select auth.uid())`. A `security definer` function that is only called from other definer functions needs no grant. Trigger
   functions that write to a private table must be `security definer` too (found in M19a: the CV opt-out trigger).
4. Role checks use the helpers: `public.is_staff()` (super admin or editor), `public.is_super_admin()`, `public.current_admin_role()`,
   `public.is_active_member()`, `public.is_member_audience()`. A super admin only counts with an `aal2` JWT (D12). Admin functions start
   with `perform public.require_staff();` (or an equivalent check) and raise `42501` when not allowed.
5. **Private data lives in its own table**, not behind a column policy (RLS is per row). Visitors reach members-only data only through
   `security definer` functions that return exactly what they may see.
6. Anything with a state machine or a cross-table effect is written **only through RPCs**; anonymous submits (messages, applications,
   inquiries, ideas…) are RPCs, never an `insert` policy for `anon`.
7. Localized text is `jsonb` `{ "mk": "...", "en"?: "..." }` with `check (public.is_localized(col))` (nullable columns:
   `col is null or public.is_localized(col)`). Alt text stays per use; `alt` null = missing, `''` = decorative.
8. Seeded entity tables get `is_sample boolean not null default false` (and a partial index when purge scans it).
9. `created_at`/`updated_at timestamptz not null default now()` and `create trigger … before update … execute function
public.touch_updated_at()`.
10. Foreign keys: choose `on delete` on purpose (cascade, set null or restrict) and index the referencing column. Dates and years that
    the site shows are Europe/Skopje (`at time zone 'Europe/Skopje'`).
11. Enums for fixed status lists that are DECIDED; never invent a status. Ask the owner before changing one.
12. Submit RPCs (service role only) return the stored row as jsonb and take the app's clock as `p_now timestamptz default null`
    (consent time, creation time and the year of the reference), as the repositories take `now` from the caller. Audit triggers
    (`audit_row_change`) skip an update that changes nothing; pass columns that do not count as a change (for example `'read_at'`)
    as the third trigger argument.

## Tests (pgTAP)

- One file per area in `supabase/tests/database/`, named `NN_area.test.sql`, each `begin; select plan(N); … select * from finish();
rollback;`. Fixtures are inserted inside the test (as `postgres`), including `auth.users` rows.
- Act as a role with a helper like the ones in `10_people.test.sql`:
  - `pg_temp.act_as(uid, aal)` → `reset role; set_config('request.jwt.claims', {sub, role: 'authenticated', aal}); set local role authenticated`
  - `pg_temp.act_as_visitor()` → role `anon`
  - `pg_temp.changed(sql)` → rows a statement changed (a data-modifying CTE cannot be nested in a select)
  - Explicitly `grant execute on all functions in schema pg_temp to anon, authenticated, service_role` after creating test helpers: M19b revoked the global PUBLIC function default.
  - call `reset role` before inserting fixtures or reading server-only tables as `postgres`.
- Test every role that matters for a table: visitor, pending member, active member, alumni, event manager, editor, super admin without
  and with `aal2`. Use `throws_ok(sql, '42501', null, desc)` for denied writes/calls and `is(count, n, desc)` for what each role sees.
- A failing policy test is information: decide whether the policy or the expectation is wrong (in M19a a test wrongly expected a super
  admin without 2-step to see no `admin_roles` row; they do see their own).
- The count in `plan(N)` must match; pgTAP reports "planned N but ran M".

## Seed (M19d)

`supabase/seed.sql` is generated from the app fixtures by `scripts/generate-seed.ts` (run under Vitest) and committed; a drift test
fails if it is stale (`UPDATE_SEED=1 pnpm exec vitest run scripts/generate-seed.test.ts` rewrites it). Never edit it by hand. Every row is `is_sample = true` except the shipped `/brand` media. `purge_sample_data()`
must leave no sample row (tested); it needs a super admin with a 2-step session. Sample accounts use `sample+<uuid>@example.invalid`.

Tests include `\ir ../helpers/isolate.inc` right after `begin;` so the seeded rows do not disturb their fixtures (rolled back).
Public roles have column grants on some tables (`events`, `memories`): a test that runs `select *` as `anon` or `authenticated` fails; list columns.
