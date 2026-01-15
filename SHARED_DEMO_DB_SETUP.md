# Shared Demo Database Setup - Implementation Summary

## Overview

This implementation sets up a "single shared demo database" workflow where Railway staging website and local dev (Cursor) use the **SAME MySQL database** (Railway staging demo DB).

## Files Changed

### 1. Environment Configuration
- **`server/_core/env.ts`**
  - Updated environment contract documentation
  - Added `getDatabaseInfo()` helper function (exports host/db, never password)
  - Enhanced logging to show DB host/database in dev only
  - Production guarantee: NEVER uses `STAGING_DATABASE_URL` in production

### 2. Server API Endpoint
- **`server/_core/index.ts`**
  - Added `/api/health` endpoint that returns demo DB info (dev only)
  - Production returns minimal response (no demo DB info)

### 3. Client UI Components
- **`client/src/components/DemoDbBanner.tsx`** (NEW)
  - Banner component that displays when connected to demo DB
  - Only shown in development (never in production)
  
- **`client/src/App.tsx`**
  - Added `DemoDbBanner` component to app root

### 4. Safety Guards for Destructive Scripts
- **`scripts/utils/check-demo-db.mjs`** (NEW)
  - Utility functions to detect and block Railway demo DB connections
  - `isDemoDatabase()` - checks if connection string points to Railway
  - `checkNotDemoDatabase()` - exits with error if demo DB detected

- **`scripts/reset-db.mjs`**
  - Added guard to prevent running against demo DB

- **`scripts/seed-database.mjs`**
  - Added guard to prevent running against demo DB

- **`scripts/seed-baseline.mjs`**
  - Added guard to prevent running against demo DB

- **`scripts/reset-local-db.mjs`**
  - Added guard to prevent running against demo DB

### 5. Documentation
- **`docs/runbooks/SHARED_DEMO_DB.md`** (NEW)
  - Complete setup guide
  - Environment configuration instructions
  - Verification checklist
  - Troubleshooting guide

## Code Changes

### 1. Environment Contract (`server/_core/env.ts`)

**Added helper function:**
```typescript
export function getDatabaseInfo() {
  // Returns { host, database, isDemoDb }
  // Never exposes password
}
```

**Enhanced logging (dev only):**
```typescript
if (!process.env.NODE_ENV || process.env.NODE_ENV !== "production") {
  const dbInfo = getDatabaseInfo();
  console.log(`[ENV] Database: ${dbInfo.database} @ ${dbInfo.host}`);
  if (dbInfo.isDemoDb) {
    console.log(`[ENV] ⚠️  Connected to Railway staging demo DB`);
  }
}
```

### 2. API Endpoint (`server/_core/index.ts`)

**Added `/api/health` endpoint:**
```typescript
app.get("/api/health", async (req, res) => {
  const { getDatabaseInfo } = await import('./env');
  const dbInfo = getDatabaseInfo();
  
  if (process.env.NODE_ENV === "development") {
    res.json({
      status: 'ok',
      isDemoDb: dbInfo.isDemoDb,
      host: dbInfo.host,
      database: dbInfo.database,
    });
  } else {
    res.json({ status: 'ok' }); // Production: minimal
  }
});
```

### 3. Banner Component (`client/src/components/DemoDbBanner.tsx`)

**New component:**
```tsx
export function DemoDbBanner() {
  // Fetches /api/health
  // Shows banner if isDemoDb === true
  // Never shown in production
}
```

### 4. Safety Guards (`scripts/utils/check-demo-db.mjs`)

**New utility:**
```javascript
export function checkNotDemoDatabase(connectionString, scriptName) {
  // Checks for: railway.internal, proxy.rlwy.net, up.railway.app, railway.app
  // Exits with error if demo DB detected
}
```

## Setup Instructions for Jay

### Step 1: Update `.env` File

**Option A - Railway Internal Host (if accessible):**
```env
DATABASE_URL=mysql://cmc_go:<password>@mysql-uqki.railway.internal:3306/railway
```

**Option B - Railway Public Proxy (fallback):**
```env
DATABASE_URL=mysql://cmc_go:<password>@shortline.proxy.rlwy.net:56109/railway
```

**Replace `<password>` with the actual password for the `cmc_go` user.**

### Step 2: Restart Dev Server

```bash
# Stop current dev server (Ctrl+C)
# Then restart:
pnpm dev
```

### Step 3: Verify Connection

Check terminal output for:
```
[ENV] Database: railway @ shortline.proxy.rlwy.net
[ENV] ⚠️  Connected to Railway staging demo DB (shared with staging website)
```

### Step 4: Verify UI Banner

Open browser - you should see a yellow banner at the top:
```
⚠️ CONNECTED TO RAILWAY STAGING DEMO DB
```

## Verification Checklist

- [ ] Local dev starts (`pnpm dev`)
- [ ] App loads in browser
- [ ] Yellow banner appears: "CONNECTED TO RAILWAY STAGING DEMO DB"
- [ ] People list matches staging website (identical data)
- [ ] Change person status locally → visible on staging after refresh
- [ ] Change person status on staging → visible locally after refresh

## Production Behavior - No Changes

✅ **Confirmed:** Production behavior is unchanged:
- Production ONLY uses `DATABASE_URL` (never `STAGING_DATABASE_URL`)
- Banner never appears in production
- API endpoint returns minimal response in production
- All safety guards only affect development scripts

## Safety Guarantees

1. **Production Safety:**
   - `STAGING_DATABASE_URL` is NEVER checked in production
   - Banner never appears in production
   - API endpoint returns minimal response in production

2. **Destructive Commands Blocked:**
   - `db:reset`, `db:seed`, `db:reset:local`, `db:seed:baseline` are blocked when connected to demo DB
   - Prevents accidental modification of shared database

3. **Visual Indicator:**
   - Yellow banner clearly shows when connected to demo DB
   - Helps prevent confusion about which database is in use

## Testing

To test the setup:

1. **Set DATABASE_URL to Railway demo DB** (see setup instructions)
2. **Start dev server:** `pnpm dev`
3. **Verify banner appears** in browser
4. **Verify destructive commands are blocked:**
   ```bash
   pnpm db:seed
   # Should show: "❌ SAFETY CHECK FAILED - Cannot run against demo DB"
   ```
5. **Verify changes are shared:**
   - Change a person's status locally
   - Refresh staging website
   - Status change should be visible

## Documentation

Full documentation available at:
- **`docs/runbooks/SHARED_DEMO_DB.md`** - Complete setup and troubleshooting guide
