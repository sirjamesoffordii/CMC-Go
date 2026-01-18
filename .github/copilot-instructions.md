# Copilot / AI Agent Instructions — CMC Go

This file is a concise, actionable guide to help AI coding agents be productive in this repository.

## 0. Governance (read first)
- **Coordinator doctrine:** `docs/authority/CMC_GO_COORDINATOR.md` (truth enforcement, evidence gates, role boundaries)
- **Human authority:** Sir James is the source of product intent
- **System doctrine (optional deep read):** `docs/authority/The Coherence Engine.md`

Operational constraint:
- Agents do not take work on their own initiative. The Coordinator assigns work via GitHub Issues, and all progress/evidence is reported via Issue/PR comments.

Continuous mode:
- Within an assigned Issue, agents should continue executing autonomously to completion (or an explicit Blocked escalation), using the “next best step” consistent with their role doc.
- Keep updates high-signal (milestones + evidence); avoid asking the human operator for routine direction.

When uncertain about priorities or acceptance criteria, prefer the Coordinator doctrine over agent self-direction.

## 1. Big picture
- **Purpose**: A map-first coordination app for CMC conference attendance management (frontend React + backend tRPC + MySQL)
- **Architecture**: Frontend in `client/` (React 19 + Tailwind + Radix UI), backend in `server/` (tRPC + Express), DB schema in `drizzle/schema.ts`, scripts in `scripts/`
- **Stack**: TypeScript everywhere, Drizzle ORM, MySQL connection pooling, Vite for frontend builds

## 2. Key files to read first
- `drizzle/schema.ts` — Complete DB schema with JSDoc explaining each table's purpose, enums, and relationships
- `server/routers.ts` — Main tRPC router (1600+ lines) - all API endpoints defined here
- `server/_core/authorization.ts` — Role-based permission system ("editing ladder" from STAFF → ADMIN)
- `server/db.ts` — Database access layer with pooled connections; all DB queries implemented here
- `client/src/components/PersonRow.tsx` — Status color mapping (`STATUS_COLORS`) and UI patterns
- `package.json` — All developer commands (`db:setup`, `db:migrate`, `dev`, `build`, `test`)
- `.env.example` — Required environment variables (DATABASE_URL, SENTRY_DSN)

## 3. DB and migration conventions
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Migration flow**: Schema in `drizzle/schema.ts` → `pnpm db:generate` → SQL files in `drizzle/migrations/` → `pnpm db:migrate` applies them
- **Fresh DB setup**: `pnpm db:setup` = init DB + push schema + seed data (safe for local dev only)
- **Force push**: `pnpm db:push:yes` or `node scripts/db-push-yes.mjs` (skips migration files, applies schema directly)
- **Verify schema**: `pnpm db:check` runs `check-schema.mjs` to validate schema matches DB
- **Connection pooling**: Uses `mysql2` connection pools (see `server/db.ts` - critical for production)
- **Production safeguards**: Seed scripts check for demo DB connection strings and refuse to run

## 4. Project-specific data model notes
- **DistrictSlug** (`districts.id` varchar): Source of truth for districts, MUST match SVG `<path id="...">` in `client/public/map.svg`
- **personId** (`people.personId` varchar): Authoritative person identifier from Excel imports; many tables reference this (not `people.id`)
- **Status enum**: `"Yes" | "Maybe" | "No" | "Not Invited"` (exact strings, case-sensitive) - see `STATUS_COLORS` in PersonRow.tsx
- **Households**: Prevent double-counting children/guests for married staff via `households` table and `people.householdId` FK
- **Audit trails**: `statusChanges` table tracks who changed status, when, from/to values (see `drizzle/schema.ts` line 245+)
- **Indexes**: All common query paths indexed (e.g., `primaryCampusId_idx`, `status_idx`, `householdId_idx`)

## 5. Developer workflows and commands
```bash
# Fresh local dev setup
pnpm install
pnpm db:setup              # Init + migrate + seed (local only!)
pnpm dev                   # Start dev server (tsx watch server/_core/index.ts)

# Database operations
pnpm db:migrate            # Apply pending migrations
pnpm db:push:yes           # Force push schema (dev only, skips migrations)
pnpm db:seed               # Seed data only
pnpm db:check              # Verify schema consistency
pnpm db:reset              # Drop all data, re-seed

# Testing & validation
pnpm test                  # Run vitest unit tests
pnpm test:coverage         # Generate coverage report
pnpm e2e                   # Run Playwright E2E tests
pnpm check                 # TypeScript type checking (tsc --noEmit)

# Build & deploy
pnpm build                 # Vite frontend + esbuild backend bundle
pnpm start                 # Production server (NODE_ENV=production)
```

## 6. Authorization system ("editing ladder")
- **Roles** (ascending): `STAFF` → `CO_DIRECTOR` → `CAMPUS_DIRECTOR` → `DISTRICT_DIRECTOR` → `REGION_DIRECTOR` → `ADMIN`
- **Editing scope**: Each role can edit their scope + subordinate scopes (see `server/_core/authorization.ts`)
  - STAFF/CO_DIRECTOR: Own campus only
  - CAMPUS_DIRECTOR: Entire district (all campuses in their district)
  - DISTRICT_DIRECTOR: Entire region (all districts in their region)
  - REGION_DIRECTOR/ADMIN: National (all data)
- **Approval flow**: New users self-register with `PENDING_APPROVAL` status; admins approve via `approvalStatus` field
- **tRPC middleware**: `protectedProcedure` requires authenticated user, `adminProcedure` requires ADMIN role

## 7. Frontend patterns
- **tRPC client**: `client/src/lib/trpc.ts` exports typed tRPC client; import with `import { trpc } from "../lib/trpc"`
- **Optimistic updates**: UI updates immediately (e.g., status change), backend creates audit record in `statusChanges` table
- **Status colors**: `STATUS_COLORS` object in PersonRow.tsx - replicate this pattern for consistency
- **Drag & drop**: Uses `@dnd-kit` for sortable lists (see PersonRow.tsx `useSortable` hook)
- **Forms**: Radix UI components + `react-hook-form` + zod validation (see component library in `client/src/components/`)
- **Routing**: Uses `wouter` (lightweight router, has custom patch in `patches/wouter@3.7.1.patch`)

## 8. Backend patterns
- **DB queries**: All queries in `server/db.ts` (1300+ lines) - use existing query patterns as templates
- **Error handling**: `server/_core/errorHandler.ts` provides structured errors; Sentry integration sanitizes PII before logging
- **Sessions**: `server/_core/session.ts` manages JWT sessions; stores session hashes in `user_sessions` table
- **Context**: tRPC context in `server/_core/context.ts` provides `user` and `db` to all procedures
- **File uploads**: AWS S3 via `@aws-sdk/client-s3` - see `server/storage.ts` for presigned URL patterns

## 9. Import/export flow
- **Excel import**: `scripts/ingest-excel.mjs` parses Excel → JSON → inserts to DB preserving `personId` mapping
- **CSV import**: UI-based import via tRPC endpoint; tracks import runs in `importRuns` table
- **Seed data**: `scripts/seed-database.mjs` loads from JSON files (`seed-people.json`, `seed-campuses.json`, etc.)
- **Critical**: Always preserve `personId` values when importing - this is the stable identifier across imports

## 10. Testing approach
- **Unit tests**: Vitest in `server/*.test.ts` - test individual tRPC endpoints with mock DB calls
- **E2E tests**: Playwright in `e2e/smoke.spec.ts` - test full user flows
- **Test pattern**: See `server/import.test.ts` for example of testing import logic with fixtures
- **Run before commits**: `pnpm test && pnpm check` to catch type errors and broken tests

## 11. Error monitoring
- **Sentry**: Initialized in `server/_core/sentry.ts` BEFORE any other imports (critical!)
- **PII sanitization**: `sanitizeErrorForLogging()` removes sensitive data before logging
- **Environment**: Set `SENTRY_DSN` (backend) and `VITE_SENTRY_DSN` (frontend) in `.env`

## 12. Safety constraints
- **Never modify** `DistrictSlug` values or `people.personId` without comprehensive migration + import script updates
- **Enum changes**: Status enum strings are hardcoded in UI - changing requires migration + frontend updates
- **Production checks**: Scripts prevent running destructive operations on demo/production DBs
- **Connection pooling**: Always use `getDb()` from `server/db.ts` - never create raw connections

## Questions or unclear sections?
Tell me which area needs more detail (migrations, authorization, frontend patterns, tRPC router structure, etc.) and I will expand it.
