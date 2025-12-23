# Local Development Setup

This document explains how to get the CMC Go map rendering with real data in local development.

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Initialize and seed the database:**
   ```bash
   pnpm db:setup
   ```
   This will:
   - Create the SQLite database at `./data/cmc_go.db`
   - Initialize all tables with the correct schema
   - Seed minimal dev data (20 districts + 10 sample people)

3. **Start the development server:**
   ```bash
   pnpm dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:3000`

The map should now display districts with visible data without requiring login.

## Database Setup

The app uses SQLite for local development. The database is automatically initialized when the server starts if tables don't exist.

### Manual Database Operations

- **Initialize database schema only:**
  ```bash
  pnpm db:init
  ```

- **Seed minimal dev data:**
  ```bash
  pnpm db:seed
  ```

- **Push schema changes (if you modify schema.ts):**
  ```bash
  pnpm db:push
  ```

## API Endpoints

The map uses these tRPC endpoints (all are public, no auth required):

- `districts.list` - Get all districts
- `people.list` - Get all people

Both endpoints use `publicProcedure`, so they work without authentication. The "Missing session cookie" warning in logs is harmless - it just means the user context is null, which is fine for public endpoints.

## Troubleshooting

### Map shows no data

1. Check that the database has data:
   ```bash
   # The seed script prints a summary, or check the database directly
   ```

2. Check browser console for API errors

3. Verify districts match SVG map IDs:
   - District IDs in the database must exactly match the `id` attributes in `client/public/map.svg`

### Database locked errors

If you see "database is locked" errors:
- Stop the dev server
- Run the seed script
- Restart the dev server

### Schema mismatch errors

If you see "no such column" errors:
- The database has an old schema
- Run `pnpm db:setup` to recreate the database with the correct schema
- Note: This will delete existing data, so backup first if needed

## Dev Seed Data

The minimal dev seed includes:
- 20 districts across all regions
- 10 sample people with various statuses (Yes, Maybe, No, Not Invited)

This is enough to make the map visibly render data. For full data, use the full seed script (`scripts/seed-sqlite.mjs`) with the complete seed JSON files.

