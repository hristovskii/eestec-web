#!/usr/bin/env bash
set -euo pipefail
# Generate from the local migrated database; format deterministically before committing.
target='src/shared/data/supabase/database.types.ts'
temporary_file=$(mktemp)
trap 'rm -f "$temporary_file"' EXIT
pnpm exec supabase gen types typescript --schema public > "$temporary_file"
pnpm exec prettier --stdin-filepath "$target" < "$temporary_file" > "$target"
