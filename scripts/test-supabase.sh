#!/usr/bin/env bash
# Runs the Supabase contract suites against the local stack (`pnpm db:start`, `pnpm db:reset`).
# `supabase status -o env` prints the URL and keys; the suites read them as SUPABASE_*.
set -euo pipefail
status=$(pnpm exec supabase status -o env 2>/dev/null)
value() { printf '%s\n' "$status" | sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p" | head -n 1; }
export SUPABASE_URL="$(value API_URL)"
export SUPABASE_ANON_KEY="$(value ANON_KEY)"
export SUPABASE_SERVICE_ROLE_KEY="$(value SERVICE_ROLE_KEY)"
export SUPABASE_JWT_SECRET="$(value JWT_SECRET)"
pnpm exec vitest run --config vitest.supabase.config.ts "$@"
