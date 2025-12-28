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

1. **Update Schema**: Modify the schema definition in `server/db/schema/`
2. **Generate Migration**: Run `pnpm db:generate` to create a new migration file
3. **Review Migration**: Inspect the generated SQL in `drizzle/` before applying
4. **Test Locally**: Run `pnpm db:migrate` on your local database first
5. **Commit**: Commit both the schema changes and migration file together
6. **Deploy**: The migration will run automatically on staging/production deployment

## Canonical Migration Chain

The following migration files in `drizzle/` represent the canonical schema history:

1. `0000_initial_schema.sql` - Initial database schema
2. `0001_dashing_dark_phoenix.sql` - First schema evolution
3. `0002_lying_ink.sql` - Second schema evolution
4. `0003_flowery_master_mold.sql` - Third schema evolution
5. `0004_add_people_household_fields.sql` - Added people and household fields

All other 0000 and 0001 variants have been archived to `drizzle/_archive/` as they were duplicates.

## Troubleshooting

### Schema Drift Detected

If Drizzle detects schema drift (local schema doesn't match migrations):

1. **Don't panic**: This is recoverable
2. **Don't regenerate**: Don't create duplicate 0000/0001 files
3. **Create additive migration**: Generate a new migration that adds the missing changes
4. **Verify**: Ensure the new migration is additive and safe

### Migration Conflicts

If you encounter migration conflicts:

1. Pull latest changes from the repository
2. Ensure your local database matches production
3. Generate new migrations with the next sequence number
4. Coordinate with the team to avoid parallel schema changes

---

**Last Updated**: 2025-12-28
**Established By**: Migration system cleanup and standardization
