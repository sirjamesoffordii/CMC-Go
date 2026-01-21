# Local Database Sync with Railway Staging

This runbook explains how to keep your local development database in sync with the Railway staging database in a safe, deterministic way.

## Philosophy

- **No automatic syncing**: We do NOT want automatic bidirectional syncing
- **Deterministic parity**: Local DB matches Railway via migrations + seeds
- **Railway is source of truth**: Railway staging DB schema is authoritative
- **Local DB is recreated**: Local DB is dropped/recreated or migrated to match Railway

## Environment Contract

### Database URLs

- **`DATABASE_URL`**: Primary database connection
  - **Local dev**: Points to `localhost:3306` or `127.0.0.1:3306`
  - **Production**: Points to Railway production database
  - **Always respected**: If set, this is used (highest priority)

- **`STAGING_DATABASE_URL`**: Railway staging database (dev-only convenience)
  - **Only in non-production**: Never checked when `NODE_ENV=production`
  - **Temporary use**: Useful when you want to temporarily point to staging
  - **Safety**: Production code never uses this variable

### Precedence

1. `DATABASE_URL` (explicit, always respected)
2. `STAGING_DATABASE_URL` (only if not production)
3. Railway auto-provided variables (`MYSQL_URL`, `MYSQL_HOST`, etc.)

## Commands

### Reset Local Database

**⚠️ WARNING: This deletes ALL data in your local database!**

```bash
# Reset local database (requires --force flag)
pnpm db:reset:local --force
```

**What it does:**
1. **Safety checks**: Validates that `DATABASE_URL` points to localhost/127.0.0.1/docker mysql
2. **Hard-fails** if:
   - `NODE_ENV=production` or `APP_ENV=production`
   - Host contains "railway", "rlwy.net", or other remote hosts
3. **Drops and recreates** the database
4. **Runs migrations** to recreate schema
5. **Runs seed** to populate with dev data

**Safety guarantees:**
- Only works with local databases (localhost, 127.0.0.1, docker mysql)
- Never executes on Railway/production hosts
- Requires explicit `--force` flag

### Run Migrations

```bash
# Apply all pending migrations
pnpm db:migrate
```

**What it does:**
- Reads migration files from `drizzle/migrations/`
- Applies migrations in order
- Tracks applied migrations in `drizzle_migrations` table
- Safe to run multiple times (idempotent)

### Seed Database

```bash
# Full seed (districts, campuses, people, needs, notes, etc.)
pnpm db:seed

# Baseline seed only (settings - required for app to boot)
pnpm db:seed:baseline
```

**What it does:**
- `db:seed`: Populates database with comprehensive dev data
- `db:seed:baseline`: Only seeds required baseline data (settings)
- Both are **idempotent** (safe to run multiple times)

## Workflow: Syncing Local DB with Railway

### Initial Setup

1. **Set up local MySQL database**
   ```bash
   # Create local database (if not exists)
   mysql -u root -p
   CREATE DATABASE cmc_go_local;
   ```

2. **Configure `.env` file**
   ```env
   # Local development database
   DATABASE_URL=mysql://root:password@localhost:3306/cmc_go_local
   
   # Optional: Railway staging (for reference, not used by default)
   STAGING_DATABASE_URL=mysql://user:pass@shortline.proxy.rlwy.net:56109/railway
   ```

3. **Reset and seed local database**
   ```bash
   pnpm db:reset:local --force
   ```

### Regular Sync Workflow

When Railway staging has new migrations:

1. **Pull latest code** (includes new migration files)
   ```bash
   git pull origin main
   ```

2. **Reset local database** (to match Railway schema)
   ```bash
   pnpm db:reset:local --force
   ```

3. **Verify** (optional)
   ```bash
   # Check that migrations were applied
   pnpm db:migrate  # Should show "all migrations already applied"
   ```

### Alternative: Migrate Without Reset

If you want to preserve local data:

1. **Apply new migrations only**
   ```bash
   pnpm db:migrate
   ```

2. **Note**: This only works if your local schema is already in sync. If there's drift, use `db:reset:local` instead.

## Migration Audit

### Checking Migration Status

```bash
# Check what migrations exist
ls -la drizzle/migrations/

# Check what's applied in database
mysql -u root -p cmc_go_local -e "SELECT * FROM drizzle_migrations;"
```

### Verifying Schema Parity

To verify that migrations fully describe the Railway schema:

1. **Connect to Railway staging** (temporarily)
   ```env
   DATABASE_URL=mysql://user:pass@shortline.proxy.rlwy.net:56109/railway
   ```

2. **Generate schema diff** (if using drizzle-kit)
   ```bash
   pnpm db:generate
   ```

3. **Compare**: If new migration files are generated, Railway has schema changes not in migrations

## Required Baseline Data

The following tables/data are **required** for the app to boot:

- **`settings`**: App configuration
  - `app_version`: Current app version
  - `last_updated`: Last update timestamp

These are automatically seeded by `db:seed:baseline` or `db:seed`.

## Safety Warnings

### ⚠️ Never Run on Production

- `db:reset:local` hard-fails if `NODE_ENV=production`
- `db:seed` hard-fails if `APP_ENV=production`
- Always verify `DATABASE_URL` before running destructive commands

### ⚠️ Verify Host Before Reset

The reset script checks that the host is local:
- ✅ Allowed: `localhost`, `127.0.0.1`, `mysql` (docker), `db` (docker)
- ❌ Blocked: `railway`, `rlwy.net`, `amazonaws.com`, etc.

### ⚠️ Backup Before Reset

If you have important local data:
```bash
# Export local database
mysqldump -u root -p cmc_go_local > backup.sql

# Reset
pnpm db:reset:local --force

# Restore if needed
mysql -u root -p cmc_go_local < backup.sql
```

## Troubleshooting

### "Host is not a local database"

**Error**: `Host 'shortline.proxy.rlwy.net' is not a local database`

**Solution**: Your `DATABASE_URL` points to Railway. Update `.env` to point to localhost:
```env
DATABASE_URL=mysql://root:password@localhost:3306/cmc_go_local
```

### "No migration files found"

**Error**: `⚠️ No migration files found in drizzle/migrations/ directory`

**Solution**: Migration files should be in `drizzle/migrations/`. If empty, you may need to:
1. Generate migrations from schema: `pnpm db:generate`
2. Or copy migrations from Railway if they exist there

### "Migrations already applied"

**Info**: This is normal if migrations were already run. The migration system tracks applied migrations and skips them.

### "Permission denied: Cannot drop/create database"

**Error**: Your MySQL user doesn't have `DROP DATABASE` or `CREATE DATABASE` permissions.

**Solution**: Grant permissions or use a user with full privileges:
```sql
GRANT ALL PRIVILEGES ON *.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

## Summary

- **Local DB**: Use `DATABASE_URL=mysql://...@localhost:3306/...`
- **Reset**: `pnpm db:reset:local --force` (drops, recreates, migrates, seeds)
- **Migrate**: `pnpm db:migrate` (applies pending migrations)
- **Seed**: `pnpm db:seed` (populates dev data)
- **Safety**: Scripts hard-fail on production/remote hosts

For questions or issues, see the main [MIGRATION_RULES.md](./MIGRATION_RULES.md) document.
