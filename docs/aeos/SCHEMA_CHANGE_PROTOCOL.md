# Schema Change Protocol (AEOS)

Goal: make schema changes deterministic, testable, and safe to deploy.

## Required steps

1. **Update Drizzle schema**

- Edit `drizzle/schema.ts` (authoritative)

2. **Create a new migration**

- Add a new SQL file under `drizzle/` (do not edit existing migrations)

3. **Update server-side behavior**

- Update `server/db.ts` and any routers so defaults are safe
- Prefer soft deletes over hard deletes when data should be recoverable

4. **Test against a real MySQL schema**

- CI already uses MySQL service.
- Locally, prefer Docker MySQL and run:
  - `docker-compose up -d`
  - `pnpm test:localdb`

5. **PR must include deploy note**

- If migration is required before runtime code, explicitly call that out.

## Common footguns

- Tests passing against an old remote DB but failing in CI MySQL
- Writing queries that assume new columns exist without updating migration
- Hard deleting rows that should be archived (auditability)
