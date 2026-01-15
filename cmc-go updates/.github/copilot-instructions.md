# Copilot / AI Agent Instructions — CMC Go

This file is a concise, actionable guide to help AI coding agents be productive in this repository.

1. Big picture
- Purpose: a map-first coordination app (frontend React + backend tRPC + MySQL). See `README.md` for full overview.
- Architecture: frontend in `client/` (React + Tailwind), backend server code in `server/` (tRPC routes in `server/routers.ts`), DB schema in `drizzle/schema.ts` and scripts in `scripts/`.

2. Key files to read first
- `drizzle/schema.ts` — authoritative schema (enums, table relationships, `people.personId` and `districts.id` conventions).
- `client/public/map.svg` — SVG path `id` values must match `districts.id` (DistrictSlug).
- `server/routers.ts` — tRPC endpoints and how APIs are organized.
- `package.json` — developer commands (notably `db:setup`, `db:migrate`, `dev`, `build`, `test`).
- `scripts/` — DB helpers and seed/migration scripts (`init-mysql-db.mjs`, `run-migrations.mjs`, `seed-database.mjs`, `apply-0004.mjs`).

3. DB and migration conventions
- Uses Drizzle ORM / drizzle-kit. Schema lives in `drizzle/schema.ts` and generated artifacts may live under `drizzle/`.
- Migrations are invoked with `pnpm db:migrate` (runs `node scripts/run-migrations.mjs`) and `pnpm db:push` (drizzle-kit push).
- `pnpm db:setup` runs: `node scripts/init-mysql-db.mjs && pnpm db:migrate && pnpm db:seed` (see `package.json`). Use this when creating a fresh dev DB.
- Environment: scripts read `DATABASE_URL` (use `.env` with `DATABASE_URL=mysql://...`). Confirm `dotenv` usage in scripts if needed.

4. Project-specific data model notes agents must know
- `DistrictSlug` is the canonical district ID — must match SVG `id` attributes (case-sensitive).
- `people.personId` (varchar) is authoritative for imports and cross-table references (many tables reference personId as varchar).
- Households are stored in `households` with `householdId` on `people` (see `people.householdId`).
- Status enum values: `Yes`, `Maybe`, `No`, `Not Invited` (see `drizzle/schema.ts`). Avoid changing enum strings without migration.

5. Developer workflows and concrete commands
- Dev server: `pnpm install` then `pnpm dev` (uses `tsx` to run server/_core/index.ts).
- Run migrations: `pnpm db:migrate` or `node scripts/run-migrations.mjs`.
- Fresh DB setup: `pnpm db:setup` — wraps init, migrate, and seed.
- Seed only: `pnpm db:seed` or `node scripts/seed-database.mjs`.
- Push schema (drizzle): `pnpm db:push` or `pnpm db:push:yes` to force push.
- Tests: `pnpm test` (vitest).

6. Patterns and conventions to follow (examples)
- Optimistic UI updates: frontend updates status immediately; backend records `statusLastUpdated` and `statusChanges` audit rows (see `drizzle/schema.ts`).
- SVG mapping: ensure every `<path id="...">` in `client/public/map.svg` matches a `districts.id` row.
- Import flow: CSV/Excel import uses `scripts/ingest-excel.mjs` and seed helpers — preserve `personId` mapping.

7. Integration and external deps
- Uses MySQL (`mysql2`), drizzle-orm, and Manus-hosted services in production (see README for Manus integration instructions).
- AWS S3 client is present for storage (`@aws-sdk/client-s3`) — check `server/storage.ts` before modifying uploads.

8. When changing DB schema
- Update `drizzle/schema.ts` and add a corresponding SQL migration or update `scripts/run-migrations.mjs` flow.
- For backfills or one-off SQL, use files in `scripts/` (e.g., `apply-0004.mjs` exists for targeted ALTERs).
- Always run `pnpm db:check` (`node scripts/check-schema.mjs`) after schema changes.

9. Helpful pointers for code edits
- Look at `server/db.ts` for DB connection patterns and pooled client usage.
- `client/src/components/PersonRow.tsx` contains status color mapping and UI patterns to emulate.
- Tests in `server/*.test.ts` show expected API behavior — update/add tests when changing endpoints.

10. Safety and non-goals
- Do not change `DistrictSlug` values or `people.personId` semantics without migration and import updates.
- Avoid broad refactors of enums or DB types without adding migration scripts and test updates.

If anything here is unclear or you'd like more detail on a specific area (migrations, seed flow, tRPC router structure), tell me which section to expand and I will iterate.
