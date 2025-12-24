# Local Development Setup

This document explains how to get the CMC Go application running with MySQL/TiDB database in local development.

## Prerequisites

1. **MySQL/TiDB Database:**
   - Local MySQL server, or
   - TiDB Cloud instance, or
   - Any MySQL-compatible database

2. **Environment Variables:**
   Create a `.env` file in the project root:
   ```
   DATABASE_URL=mysql://user:password@host:port/database
   ```

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Setup database (creates schema and seeds data):**
   ```bash
   pnpm db:setup
   ```
   This will:
   - Verify database connection
   - Run migrations to create all tables
   - Seed dev data (20 districts, ~40-60 campuses, ~100-200 people)

3. **Start the development server:**
   ```bash
   pnpm dev
   ```
   The server includes a startup health check that verifies the schema is correct.

4. **Open in browser:**
   Navigate to `http://localhost:3000`

The map should now display districts with visible data.

## Database Setup

The app uses MySQL/TiDB for all environments. The database schema is managed through Drizzle migrations.

### Manual Database Operations

- **Initialize database connection (verify only):**
  ```bash
  pnpm db:init
  ```

- **Run migrations (apply schema):**
  ```bash
  pnpm db:migrate
  ```

- **Push schema directly (dev only, faster for fresh DB):**
  ```bash
  pnpm db:push:yes
  ```

- **Seed dev data:**
  ```bash
  pnpm db:seed
  ```

- **Check schema:**
  ```bash
  pnpm db:check
  ```

- **Reset database (truncate tables, dev only):**
  ```bash
  pnpm db:reset
  ```

## API Endpoints

The map uses these tRPC endpoints (all are public, no auth required):

- `districts.list` - Get all districts
- `people.list` - Get all people

Both endpoints use `publicProcedure`, so they work without authentication. The "Missing session cookie" warning in logs is harmless - it just means the user context is null, which is fine for public endpoints.

## Troubleshooting

### Server won't start - Health check fails

If the server fails to start with schema errors:
1. Check the error message - it will show which tables/columns are missing
2. Run `pnpm db:migrate` to apply migrations
3. Or run `pnpm db:push:yes` to sync schema directly
4. Verify with `pnpm db:check`

### Map shows no data

1. Check that the database has data:
   ```bash
   pnpm db:check
   # Or connect to DB and run: SELECT COUNT(*) FROM districts;
   ```

2. Check browser console for API errors

3. Verify districts match SVG map IDs:
   - District IDs in the database must exactly match the `id` attributes in `client/public/map.svg`

### DATABASE_URL not set

If you see "DATABASE_URL environment variable is required":
- Create `.env` file in project root
- Add: `DATABASE_URL=mysql://user:password@host:port/database`

### Connection errors

If you see connection errors:
- Verify MySQL/TiDB server is running
- Check DATABASE_URL is correct
- Verify user has CREATE, ALTER, DROP, INSERT, SELECT permissions
- Check firewall/network if using remote database

### Schema mismatch errors

If you see "no such column" or "table does not exist" errors:
- Run `pnpm db:migrate` to apply migrations
- Or run `pnpm db:push:yes` to sync schema
- Verify with `pnpm db:check`

## Dev Seed Data

The dev seed includes:
- ~20 districts across all regions
- ~40-60 campuses (2-3 per district)
- ~100-200 people with various statuses (Yes, Maybe, No, Not Invited)
- ~30-60 needs records
- ~40-80 notes records
- ~60-120 assignments records
- 2 settings records

This provides enough data to test all features. For production data, use the import scripts with your actual data files.

## Additional Resources

- **Verification Guide:** See `DB_SETUP_VERIFICATION.md` for detailed verification steps
- **Database Fix Summary:** See `DATABASE_FIX_SUMMARY.md` for complete change log
- **Schema Source:** `drizzle/schema.ts` is the single source of truth for database schema

