# Database Tooling Summary

Minimal reference for agents.

## Core commands

```bash
# Fresh local setup (schema + seed)
pnpm db:setup

# Apply tracked migrations (staging/prod-safe)
pnpm db:migrate

# Dev-only schema push (avoid on staging/prod)
pnpm db:push:yes

# Validate schema + writes
pnpm db:check
pnpm db:verify
```

## Key relationships

- `campuses.districtId` → `districts.id`
- `people.personId` is the cross-table/import key
- `needs.personId`, `notes.personId`, `assignments.personId` → `people.personId`

## Where to look

- Schema: `drizzle/schema.ts`
- Migrations runner: `scripts/run-migrations.mjs`
- Seed script: `scripts/seed-mysql-dev.mjs`
- Dev DB health endpoint: `GET /api/debug/db-health`

All scripts are production-safe, well-documented, and include proper error handling and safety checks.
