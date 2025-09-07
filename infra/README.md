# Database Migrations

Migrations live in `supabase/migrations` and must be named using the format `YYYYMMDDHHMM_description.sql`.
Timestamps use UTC and should be unique to maintain ordering.

Apply migrations sequentially with `scripts/migrate-supabase.sh`:

```bash
export DATABASE_URL="postgres://user:pass@host:5432/db"
./scripts/migrate-supabase.sh
```

## Resolving Conflicts

If two branches introduce migrations with the same timestamp, resolve by renaming one of the files with a new timestamp and rerunning the script. Never edit an existing migration that has already landed on the main branch; instead, create a new migration with the next timestamp.
