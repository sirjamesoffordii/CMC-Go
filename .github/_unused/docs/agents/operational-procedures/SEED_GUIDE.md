# Seed Guide

## Commands

```bash
# One-shot local setup (schema + seed)
pnpm db:setup

# If schema already exists
pnpm db:seed
```

## What seeding provides (dev)

- Districts/campuses
- People with statuses (`Yes`, `Maybe`, `No`, `Not Invited`)
- Sample needs/notes/assignments
- Minimal settings rows

## Verification

```bash
pnpm db:check
pnpm db:verify
```

Or spot-check in SQL:

```sql
SELECT COUNT(*) FROM districts;
SELECT COUNT(*) FROM people;
SELECT status, COUNT(*) FROM people GROUP BY status;
```

## Safety

- Seeding is blocked in production-like environments via `APP_ENV` safeguards.
