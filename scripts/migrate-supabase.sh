#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

MIGRATIONS_DIR="$(dirname "$0")/../supabase/migrations"

for file in "$MIGRATIONS_DIR"/*.sql; do
  [ -e "$file" ] || continue
  echo "Applying $(basename "$file")" >&2
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done
