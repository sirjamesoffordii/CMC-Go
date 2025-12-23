# Database Tooling Summary

## 🎯 Complete Database Management System

This project now has a complete, production-ready database management system with:

1. ✅ **Schema Management** - Migrations and schema drift prevention
2. ✅ **Seeding** - MySQL-compatible seed scripts
3. ✅ **Health Checks** - Startup checks and debug endpoints
4. ✅ **Reset Flow** - Safe local database reset

---

## 📋 Available Commands

### Schema Management

```bash
# Generate migrations from schema.ts
pnpm db:generate

# Run migrations
pnpm db:migrate

# Push schema directly (faster for fresh DB)
pnpm db:push

# Initialize database connection
pnpm db:init
```

### Seeding

```bash
# Seed database with dev data
pnpm db:seed
```

### Reset

```bash
# Reset database (truncate tables)
pnpm db:reset

# Reset database (drop & recreate)
pnpm db:reset:drop
```

### Setup

```bash
# Full setup (init + push + seed)
pnpm db:setup
```

---

## 🔄 Typical Workflows

### Initial Setup (Fresh Database)

```bash
# 1. Set DATABASE_URL in .env
# DATABASE_URL=mysql://user:password@host:port/database

# 2. Initialize and setup
pnpm db:setup

# This runs:
# - db:init (verify connection)
# - db:push (apply schema)
# - db:seed (seed dev data)
```

### After Schema Changes

```bash
# 1. Update schema.ts

# 2. Generate migration (optional, if using migrations)
pnpm db:generate

# 3. Apply changes
pnpm db:push
# OR
pnpm db:migrate

# 4. Reset and reseed (if needed)
pnpm db:reset
```

### Local Development Reset

```bash
# Quick reset (truncate tables)
pnpm db:reset

# Full reset (drop & recreate)
pnpm db:reset:drop
```

### Checking Database Health

```bash
# Start server (includes startup health check)
pnpm dev

# In development, check health endpoint
curl http://localhost:3000/api/debug/db-health
```

---

## 🛡️ Safety Features

### Production Protection

All destructive operations are blocked in production:

- ✅ `db:reset` - Blocked if `NODE_ENV === "production"` or `APP_ENV === "production"`
- ✅ `db:seed` - Blocked if `APP_ENV === "production"`
- ✅ Debug endpoint - Only available in development

### Schema Drift Prevention

- ✅ Startup health check - Server won't start if schema is broken
- ✅ Critical table/column verification
- ✅ Clear error messages with fix suggestions

### Foreign Key Safety

- ✅ Reset script truncates tables in proper order
- ✅ Temporarily disables FK checks during truncation
- ✅ Re-enables FK checks after truncation

---

## 📁 File Structure

```
scripts/
├── reset-db.mjs              # Database reset script
├── run-migrations.mjs        # Migration runner
├── seed-mysql-dev.mjs        # MySQL seed script
├── init-mysql-db.mjs         # Database initialization
└── _old/                     # Archived old scripts
    └── seed-data.sql

server/
└── _core/
    ├── db-health.ts          # Health check functions
    └── index.ts              # Server startup (includes health check)

drizzle/
├── schema.ts                 # Source of truth for schema
├── 0000_initial_schema.sql   # Initial migration
├── config.ts                 # Drizzle configuration
└── _old_migrations/          # Archived old migrations
```

---

## 🔍 Health Check System

### Startup Check

Automatically runs when server starts:

- ✅ Verifies database connection
- ✅ Checks all critical tables exist
- ✅ Verifies critical columns exist
- ✅ Warns about empty tables
- ✅ **Server won't start if critical issues found**

### Debug Endpoint

Available in development at: `GET /api/debug/db-health`

Returns:
- Connection status
- Table existence and structure
- Row counts
- Sample data
- Errors and warnings

---

## 📊 Database Schema

### Tables

1. **users** - Authentication and user management
2. **districts** - Geographic/organizational districts
3. **campuses** - Campuses within districts
4. **people** - Unique individuals (main data table)
5. **assignments** - Role assignments for people
6. **needs** - Financial/other needs
7. **notes** - Notes about people
8. **settings** - Application settings
9. **drizzle_migrations** - Migration history (auto-managed)

### Key Relationships

- `campuses.districtId` → `districts.id`
- `people.primaryCampusId` → `campuses.id` (nullable)
- `people.primaryDistrictId` → `districts.id` (nullable)
- `assignments.personId` → `people.personId`
- `needs.personId` → `people.personId`
- `notes.personId` → `people.personId`

---

## 🚨 Common Issues & Solutions

### "Schema drift detected"

**Problem:** Database schema doesn't match `schema.ts`

**Solution:**
```bash
pnpm db:push
# OR
pnpm db:migrate
```

### "Cannot reset database in production"

**Problem:** Script blocked in production

**Solution:** Ensure `NODE_ENV` and `APP_ENV` are not "production"

### "Permission denied: Cannot drop/create database"

**Problem:** User doesn't have DROP/CREATE permissions

**Solution:** Use `pnpm db:reset` (truncate) instead of `pnpm db:reset:drop`

### "DATABASE_URL environment variable is required"

**Problem:** Environment variable not set

**Solution:** Add `DATABASE_URL` to `.env` file

### "Table doesn't exist"

**Problem:** Migrations haven't been run

**Solution:**
```bash
pnpm db:push
# OR
pnpm db:migrate
```

---

## 📚 Documentation Files

- `DB_RESET_GUIDE.md` - Database reset documentation
- `DB_HEALTH_GUARDRAILS.md` - Health check system documentation
- `SEED_GUIDE.md` - Seed script documentation
- `SCHEMA_FIX_SUMMARY.md` - Schema migration summary
- `MIGRATION_GUIDE.md` - Migration guide
- `DATABASE_TOOLING_SUMMARY.md` - This file (overview)

---

## ✅ Best Practices

1. **Always use `schema.ts` as source of truth**
   - Don't manually edit database
   - Use `db:push` or `db:migrate` to apply changes

2. **Run health checks regularly**
   - Startup check runs automatically
   - Use debug endpoint in development

3. **Reset before major changes**
   - Use `db:reset` to start fresh
   - Especially useful after schema changes

4. **Keep migrations in sync**
   - Run `db:generate` after schema changes
   - Commit migration files to version control

5. **Test in development first**
   - All destructive operations blocked in production
   - Test workflows locally before deploying

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Setup fresh database | `pnpm db:setup` |
| Apply schema changes | `pnpm db:push` |
| Generate migration | `pnpm db:generate` |
| Run migrations | `pnpm db:migrate` |
| Seed dev data | `pnpm db:seed` |
| Reset database | `pnpm db:reset` |
| Check health | `curl http://localhost:3000/api/debug/db-health` |

---

**Your database tooling is complete and ready to use!** 🎉

All scripts are production-safe, well-documented, and include proper error handling and safety checks.

