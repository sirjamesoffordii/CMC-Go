# Shared Demo Database Setup

This guide explains how local development automatically connects to the **same Railway staging demo database** as the staging website.

## Overview

- **Railway staging website** uses Railway **INTERNAL** host (mysql-uqki.railway.internal)
- **Local dev (Cursor)** automatically uses Railway **PUBLIC PROXY** (shortline.proxy.rlwy.net:56109)
- Both point to the **SAME MySQL database** (shared demo DB)
- **No manual configuration needed** - local dev automatically rewrites internal host to public proxy
- No local migrations/seeds needed - just connect to the shared demo DB
- Changes made locally are immediately visible on staging (and vice versa)
- This is a **shared demo database** - be mindful of changes

## Environment Contract

### Production Behavior (Railway Staging Deployment)
- **ONLY** `DATABASE_URL` is used in production
- `DATABASE_URL` is used **exactly as provided** (no rewrites)
- Railway staging deployment uses internal host: `mysql-uqki.railway.internal:3306`
- `STAGING_DATABASE_URL` is **NEVER** checked in production (safety guarantee)

### Local Development (Cursor)
- **Automatic rewrite**: If `DATABASE_URL` host includes `railway.internal`, it's automatically rewritten to public proxy
  - `mysql-uqki.railway.internal:3306` → `shortline.proxy.rlwy.net:56109`
  - Username, password, and database name are preserved
- **Credential enforcement**: Local dev via public proxy **must use `cmc_go` user, not `root`**
  - **Recommended**: Set `DATABASE_URL` to use `cmc_go` user directly
  - **Alternative**: If `DATABASE_URL` uses `root` user, set `DEMO_DB_USER` and `DEMO_DB_PASSWORD` to auto-swap in dev
  - `root` user is blocked via public proxy for security
- **No manual configuration**: You don't need to set `DATABASE_URL` manually for local dev
- If `DATABASE_URL` already uses `proxy.rlwy.net`, no rewrite occurs
- Rewrite only happens in non-production environments

## Automatic Connection Behavior

### How It Works

1. **Railway staging deployment** (`NODE_ENV=production`):
   - Uses `DATABASE_URL` exactly as provided
   - Typically: `mysql://cmc_go:<password>@mysql-uqki.railway.internal:3306/railway`
   - No rewrites applied

2. **Local dev** (`NODE_ENV !== 'production'`):
   - If `DATABASE_URL` contains `railway.internal`, automatically rewrites to public proxy
   - If `DATABASE_URL` uses `root` user with proxy, automatically replaces with `cmc_go`
   - Rewritten to: `mysql://cmc_go:<password>@shortline.proxy.rlwy.net:56109/railway`
   - If already using `proxy.rlwy.net`, no rewrite occurs
   - Rewrite happens in-memory only (does not modify environment variables)

### Example

**Railway staging** (production):
```env
DATABASE_URL=mysql://cmc_go:<password>@mysql-uqki.railway.internal:3306/railway
# Used exactly as-is → connects via INTERNAL host
```

**Local dev** (development) - **RECOMMENDED:**
```env
DATABASE_URL=mysql://cmc_go:<password>@shortline.proxy.rlwy.net:56109/railway
# Used as-is → connects via PUBLIC PROXY
# No additional env vars needed
```

**Local dev** (development) - Alternative: With internal host (auto-rewritten):
```env
DATABASE_URL=mysql://cmc_go:<password>@mysql-uqki.railway.internal:3306/railway
# Automatically rewritten → connects via PUBLIC PROXY
# Runtime connection: mysql://cmc_go:<password>@shortline.proxy.rlwy.net:56109/railway
```

**Local dev** (development) - Alternative: With root user (auto-swapped):
```env
DATABASE_URL=mysql://root:<password>@shortline.proxy.rlwy.net:56109/railway
# OR
DATABASE_URL=mysql://root:<password>@mysql-uqki.railway.internal:3306/railway

DEMO_DB_USER=cmc_go  # Optional: defaults to "cmc_go"
DEMO_DB_PASSWORD=<cmc_go_password>  # Required when DATABASE_URL uses root
# Automatically swaps root -> cmc_go → connects as cmc_go via PUBLIC PROXY
# Runtime connection: mysql://cmc_go:<cmc_go_password>@shortline.proxy.rlwy.net:56109/railway
# Logs: "[ENV] Swapped root -> cmc_go for proxy connection (dev only)"
```

**Important Notes:**
- **Recommended:** Use `cmc_go` user directly in `DATABASE_URL` (Option 1 above)
- Local dev via public proxy **must use `cmc_go` user, not `root`**
- **Zero-friction setup:** If `DATABASE_URL` uses `root`, set `DEMO_DB_USER` and `DEMO_DB_PASSWORD` to auto-swap in dev
- `DEMO_DB_USER` defaults to `"cmc_go"` (optional to override)
- If `DEMO_DB_PASSWORD` is missing when `DATABASE_URL` uses root, app fails fast with helpful error message including copy/paste lines

**Quick Start (Recommended):**
1. Copy `.env.example` to `.env`
2. Update `DATABASE_URL` with your `cmc_go` password
3. Run `pnpm dev`

## Restart Dev Server

After cloning/pulling the repo:

1. **Start the dev server:**
   ```bash
   pnpm dev
   ```
2. **Verify connection** - Check terminal logs for:
   ```
   [ENV] DB host: shortline.proxy.rlwy.net
   [ENV] Connection path: PUBLIC PROXY
   [ENV] DB user: cmc_go
   [ENV] ⚠️  Connected to Railway staging demo DB (shared with staging website)
   ```

## Visual Indicator

When connected to the Railway staging demo DB, a **yellow banner** appears at the top of the UI:

```
⚠️ CONNECTED TO RAILWAY STAGING DEMO DB
Connection path: PUBLIC PROXY
```

or

```
⚠️ CONNECTED TO RAILWAY STAGING DEMO DB
Connection path: INTERNAL
```

This banner:
- Only appears in development (never in production)
- Confirms you're using the shared database
- Shows connection path (PUBLIC PROXY for local dev, INTERNAL for Railway staging)
- Helps prevent confusion about which database you're connected to

## Safety: Destructive Commands Blocked

**Destructive database commands are blocked** when connected to the demo DB:

- `pnpm db:reset` - ❌ Blocked
- `pnpm db:seed` - ❌ Blocked
- `pnpm db:reset:local` - ❌ Blocked
- `pnpm db:seed:baseline` - ❌ Blocked

These scripts will refuse to run if `DATABASE_URL` contains:
- `railway.internal`
- `proxy.rlwy.net`
- `up.railway.app`
- `railway.app`

**Why?** These commands would modify the shared database used by the staging website.

## Verification Steps

Use this checklist to verify the setup:

### ✅ Local Dev Starts
- [ ] Run `pnpm dev`
- [ ] Server starts without errors
- [ ] Terminal shows: `[ENV] Database: railway @ ...`

### ✅ App Loads
- [ ] Open browser to `http://localhost:3000` (or your dev port)
- [ ] App loads successfully
- [ ] Yellow banner appears: "CONNECTED TO RAILWAY STAGING DEMO DB"

### ✅ People List Matches Staging
- [ ] Navigate to `/people` page
- [ ] Compare people list with staging website
- [ ] Lists should be **identical** (same database)

### ✅ Changes Are Shared
- [ ] Change a person's status locally (e.g., "Yes" → "Maybe")
- [ ] Refresh staging website
- [ ] Status change is **immediately visible** on staging
- [ ] Change a person's status on staging
- [ ] Refresh local dev
- [ ] Status change is **immediately visible** locally

## Troubleshooting

### "Local dev is configured to use root via proxy. Root is blocked."

**Error:** `Local dev is configured to use root via proxy. Root is blocked.`

**Cause:** Your `DATABASE_URL` uses `root` user with public proxy, but `root` is not allowed via proxy.

**Solution Option 1 (Recommended):** Update `DATABASE_URL` to use `cmc_go` directly:
```env
DATABASE_URL=mysql://cmc_go:<password>@shortline.proxy.rlwy.net:56109/railway
```

**Solution Option 2:** Add auto-swap credentials to `.env`:
```env
DEMO_DB_USER=cmc_go
DEMO_DB_PASSWORD=<password_for_cmc_go_user>
```

The error message includes exact copy/paste lines you can add to your `.env` file.

### "Cannot connect to database"

**Check:**
1. `DATABASE_URL` is set correctly in `.env`
2. Password is correct (no extra spaces/quotes)
3. Network can reach Railway (try `ping shortline.proxy.rlwy.net`)
4. MySQL port is open (3306 for internal, 56109 for proxy)
5. If using `root` with proxy, ensure `DEMO_DB_PASSWORD` is set

### "Banner not showing"

**Check:**
1. `NODE_ENV` is not set to "production"
2. Dev server was restarted after updating `.env`
3. Browser console for errors (F12 → Console)
4. API endpoint: `http://localhost:3000/api/health` should return `isDemoDb: true`

### "Script blocked: Cannot run against demo DB"

**This is expected!** Destructive scripts are blocked to protect the shared database.

**To use local database instead:**
1. Set up local MySQL: `mysql -u root -p`
2. Create database: `CREATE DATABASE cmc_go_local;`
3. Update `.env`: `DATABASE_URL=mysql://root:password@localhost:3306/cmc_go_local`
4. Run migrations: `pnpm db:migrate`
5. Restart dev server: `pnpm dev`

## Summary

- **Shared DB**: Local dev and staging use the same Railway database
- **No migrations**: Just connect and go
- **Visual indicator**: Yellow banner confirms connection
- **Safety**: Destructive commands are blocked
- **Verification**: Use checklist to confirm setup

For questions or issues, see the main [LOCAL_DB_SYNC.md](./LOCAL_DB_SYNC.md) document.
