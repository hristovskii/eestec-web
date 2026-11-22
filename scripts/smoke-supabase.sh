#!/usr/bin/env bash
# Builds the site for DATA_SOURCE=supabase, starts it against the local stack (`pnpm db:start`, `pnpm db:reset`) and
# opens the public pages once. Catches what the contract suites cannot: a page that reads with the wrong role, reads
# cookies or the clock inside cached code, or whose build needs data that is not there.
set -euo pipefail
status=$(pnpm exec supabase status -o env 2>/dev/null)
value() { printf '%s\n' "$status" | sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p" | head -n 1; }
export DATA_SOURCE=supabase
export SUPABASE_URL="$(value API_URL)"
export SUPABASE_ANON_KEY="$(value ANON_KEY)"
export SUPABASE_SERVICE_ROLE_KEY="$(value SERVICE_ROLE_KEY)"
export FEATURE_FLAGS="${FEATURE_FLAGS:-phase2}"
PORT="${SMOKE_PORT:-3200}"

pnpm exec next build
log=$(mktemp)
pnpm exec next start -p "$PORT" >"$log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  curl -s -o /dev/null "http://localhost:$PORT/" && break
  sleep 1
done

failed=0
for route in / /en /events /upcoming /journey /partners /join /contact /privacy /members /memories /submit \
  /login /register /forgot-password /en/events /en/partners /en/journey /en/join /en/submit /admin/login \
  /sitemap.xml /robots.txt; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 "http://localhost:$PORT$route")
  if [ "$code" != "200" ]; then echo "FAIL $code $route"; failed=1; else echo "ok   $code $route"; fi
done
# A page can answer 200 and still have failed inside a streamed part: the server log says so.
if grep -q -E "⨯|Error" "$log"; then echo "FAIL the server logged errors"; failed=1; fi
if [ "$failed" = "1" ]; then echo '--- server log ---'; tail -n 60 "$log"; fi
exit "$failed"
