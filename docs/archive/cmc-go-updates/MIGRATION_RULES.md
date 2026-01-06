# Database Migration Rules

This document establishes the canonical rules for managing database schema migrations in this project.

## Golden Rules

### 1. Use Only `pnpm db:migrate` for Schema Changes

**`pnpm db:migrate` is the ONLY command that should be used to apply schema changes to staging and production databases.**

- ✅ **DO**: Use `pnpm db:migrate` for all environments (staging, production)
- ❌ **DON'T**: Use `pnpm db:push:dev` on staging or production
- ⚠️ **Note**: `db:push:dev` is for local development only and bypasses migration tracking

### 2. No Duplicate 0000 or 0001 Migrations

**Never generate duplicate migration files with the same sequence number.**

- The canonical migration chain is established in `drizzle/`
- Duplicate migrations have been archived to `drizzle/_archive/`
- If you encounter schema drift, create a new sequential migration (0005, 0006, etc.)
- ❌ **DON'T**: Run `drizzle-kit generate` multiple times to recreate 0000 or 0001 files

### 3. Additive Migrations Only

**All migrations must be additive and backward-compatible.**

- ✅ **DO**: Add new tables, columns, or indexes
- ✅ **DO**: Make columns nullable when adding them to existing tables
- ❌ **DON'T**: Drop columns, tables, or modify existing column types in a breaking way
- ❌ **DON'T**: Rename columns or tables (creates data loss risk)

### 4. No Manual Database Edits

**Never manually edit the database schema outside of migrations.**

- All schema changes must go through the migration system
- If manual changes are made, they will be lost or cause conflicts
- Always update the Drizzle schema files first, then generate a migration

## Migration Workflow

1. **Update Schema**: Modify the schema definition in `drizzle/schema.ts`. Schema source of truth is defined in `drizzle.config.ts`.
2. **Generate Migration**: Run `pnpm db:generate` to create a new migration file
3. **Review Migration**: Inspect the generated SQL in `drizzle/` before applying
4. **Test Locally**: Run `pnpm db:migrate` on your local database first
5. **Commit**: Commit both the schema changes and migration file together
6. **NO MERGE WITHOUT**: CloudSQL connection test or Railway Staging Health Check test, both must be green
7. **Deploy**: Apply migrations to staging first (if prod, `pnpm db:migrate`)

## Canonical Migration Chain

The official migration chain is established in `drizzle/` as follows (do not recreate these):

- `0000_initial_schema.sql` - Foundation tables (users, districts, campuses, people, assignments, needs, notes, auth_tokens, settings)
- `0001_dashing_dark_phoenix.sql` - Schema improvements (needs.type enum expansion, notes restructure)
- `0002_lying_ink.sql` - Settings table adjustments
- `0003_flowery_master_mold.sql` - Settings table schema updates
- `0004_add_people_household_fields.sql` - Household tracking fields (householdId, householdRole, spouseAttending, childrenCount)

**Duplicate migrations have been archived to `drizzle/_archive/`** to prevent schema confusion.

## Troubleshooting

### "Schema drift detected"

Your local Drizzle schema doesn't match production. This means:

1. Someone pushed schema changes without creating a migration, **OR**
2. You created a migration locally but it wasn't applied to production yet

**Solution**: Create a new sequential migration (0005, 0006, etc.) to resolve the drift.
