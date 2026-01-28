# Database Health Guardrails

## ✅ What Was Added

Guardrails to prevent silent schema drift by:

1. **Startup Health Check** - Verifies critical tables/columns exist before server starts
2. **Debug Endpoint** - Development-only endpoint to check database health at runtime
3. **Clear Error Messages** - Actionable errors that tell you exactly what's wrong

---

## 🚀 How It Works

### Startup Check

The server now performs a database health check **before starting**. If critical issues are detected, the server will **not start** and will print clear error messages.

**What it checks:**

- ✅ Database connection
- ✅ `drizzle_migrations` table exists
- ✅ All critical tables exist: `districts`, `campuses`, `people`, `needs`, `notes`, `assignments`, `settings`
- ✅ Critical columns exist in each table:
  - `people`: `personId`, `name`, `status`, `primaryDistrictId`, `primaryRegion`
  - `districts`: `id`, `name`, `region`
  - `campuses`: `id`, `name`, `districtId`
  - `needs`: `id`, `personId`, `description`
  - `notes`: `id`, `personId`, `content`
  - `assignments`: `id`, `personId`, `assignmentType`
  - `settings`: `key`, `value`

**If issues are found:**

```
[DB Health] ❌ CRITICAL: Schema drift detected!
[DB Health] Errors: Table 'people' is missing required columns: personId, status
[Startup] Database health check failed. Server will not start.
[Startup] Fix the database schema issues and try again.
```

**The server will exit with code 1** - preventing silent failures.

---

### Debug Endpoint (Development Only)

**Endpoint:** `GET /api/debug/db-health`

**Availability:** Only in development (`NODE_ENV !== "production"`)

**What it returns:**

- Connection status
- Whether `drizzle_migrations` table exists
- Detailed info for each critical table:
  - Exists or not
  - Column count
  - Row count
  - Column names
  - Sample row (if data exists)
- List of errors (missing tables/columns)
- List of warnings (empty tables, missing migrations table)

---

## 📋 Usage

### Startup Check (Automatic)

The check runs automatically when you start the server:

```bash
pnpm dev
```

**Example output (success):**

```
[DB Health] Performing startup database health check...
[DB Health] ✅ Database health check passed
[DB Health] Tables checked: 7
[DB Health] Tables with data: 5
[Database] Connected to MySQL/TiDB with connection pool
Server running on http://localhost:3000/
```

**Example output (failure):**

```
[DB Health] Performing startup database health check...
[DB Health] ❌ CRITICAL: Schema drift detected!
[DB Health] Errors:
  - Critical table 'people' does not exist
  - Table 'districts' is missing required columns: region
[Startup] Database health check failed. Server will not start.
[Startup] Fix the database schema issues and try again.
```

### Debug Endpoint (Manual Check)

**Call the endpoint:**

```bash
# In development mode
curl http://localhost:3000/api/debug/db-health

# Or open in browser
http://localhost:3000/api/debug/db-health
```

**Example JSON Response (Success):**

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "connected": true,
  "drizzleMigrationsTableExists": true,
  "tables": {
    "districts": {
      "exists": true,
      "columnCount": 5,
      "rowCount": 20,
      "columns": ["id", "name", "region", "leftNeighbor", "rightNeighbor"],
      "sampleRow": {
        "id": "Colorado",
        "name": "Colorado",
        "region": "Big Sky",
        "leftNeighbor": null,
        "rightNeighbor": null
      }
    },
    "campuses": {
      "exists": true,
      "columnCount": 3,
      "rowCount": 45,
      "columns": ["id", "name", "districtId"]
    },
    "people": {
      "exists": true,
      "columnCount": 18,
      "rowCount": 150,
      "columns": ["id", "personId", "name", "primaryRole", "status", ...],
      "sampleRow": {
        "id": 1,
        "personId": "dev_person_1",
        "name": "Alex Anderson",
        "status": "Yes",
        "primaryDistrictId": "Colorado",
        "primaryRegion": "Big Sky"
      }
    },
    "needs": {
      "exists": true,
      "columnCount": 4,
      "rowCount": 30,
      "columns": ["id", "personId", "description", "amount"]
    },
    "notes": {
      "exists": true,
      "columnCount": 4,
      "rowCount": 40,
      "columns": ["id", "personId", "content", "createdAt"]
    },
    "assignments": {
      "exists": true,
      "columnCount": 8,
      "rowCount": 90,
      "columns": ["id", "personId", "assignmentType", "roleTitle", ...]
    },
    "settings": {
      "exists": true,
      "columnCount": 3,
      "rowCount": 2,
      "columns": ["key", "value", "updatedAt"]
    }
  },
  "errors": [],
  "warnings": []
}
```

**Example JSON Response (With Issues):**

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "connected": true,
  "drizzleMigrationsTableExists": false,
  "tables": {
    "districts": {
      "exists": true,
      "columnCount": 3,
      "rowCount": 20
    },
    "people": {
      "exists": false
    },
    "needs": {
      "exists": true,
      "columnCount": 3,
      "rowCount": 0
    }
  },
  "errors": [
    "Critical table 'people' does not exist",
    "Table 'needs' is missing required columns: description"
  ],
  "warnings": [
    "drizzle_migrations table does not exist. Migrations may not have been run.",
    "Table 'needs' exists but is empty"
  ]
}
```

**Example JSON Response (Connection Failed):**

```json
{
  "success": false,
  "error": "Database connection failed: Access denied for user...",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🔧 Fixing Issues

### If Startup Check Fails:

1. **Check the error messages** - They tell you exactly what's missing
2. **Run migrations:**
   ```bash
   pnpm db:push
   # OR
   pnpm db:migrate
   ```
3. **Verify schema matches:**
   ```bash
   # Check that schema.ts matches your database
   pnpm db:generate  # Generate migration if needed
   ```
4. **Restart the server:**
   ```bash
   pnpm dev
   ```

### Common Issues:

**"Critical table 'people' does not exist"**
→ Run `pnpm db:push` or `pnpm db:migrate`

**"Table 'people' is missing required columns: personId"**
→ Schema drift detected. Run `pnpm db:push` to sync schema.

**"drizzle_migrations table does not exist"**
→ Warning only. Run `pnpm db:migrate` to create it.

**"Database connection failed"**
→ Check `DATABASE_URL` in `.env` file

---

## 🛡️ Safety Features

1. **Production Safety:**
   - Debug endpoint is **disabled in production** (`NODE_ENV === "production"`)
   - Startup check still runs in production (prevents broken deployments)

2. **Non-Blocking Warnings:**
   - Empty tables are warnings (not errors) - might be expected for new deployments
   - Missing `drizzle_migrations` is a warning (not critical)

3. **Clear Error Messages:**
   - Errors tell you exactly what's wrong
   - Errors suggest how to fix it

4. **Fast Checks:**
   - Uses `information_schema` for fast metadata queries
   - Doesn't query all data, just structure

---

## 📁 Files Changed

### Created:

- ✅ `server/_core/db-health.ts` - Health check functions

### Modified:

- ✅ `server/_core/index.ts` - Added startup check and debug endpoint

---

## 🎯 Benefits

1. **Prevents Silent Failures:**
   - Server won't start if schema is broken
   - Clear error messages tell you what's wrong

2. **Early Detection:**
   - Catches schema drift before users see errors
   - Debug endpoint lets you check health anytime

3. **Developer Friendly:**
   - Clear, actionable error messages
   - Easy to verify database state

4. **Production Safe:**
   - Debug endpoint disabled in production
   - Startup check prevents broken deployments

---

## 🔍 Testing

### Test the Startup Check:

1. **Start with good schema:**

   ```bash
   pnpm db:push
   pnpm dev  # Should start successfully
   ```

2. **Break the schema (for testing):**

   ```sql
   -- Connect to database and drop a column
   ALTER TABLE people DROP COLUMN personId;
   ```

3. **Restart server:**

   ```bash
   pnpm dev  # Should fail with clear error
   ```

4. **Fix and restart:**
   ```bash
   pnpm db:push  # Restore schema
   pnpm dev  # Should start successfully
   ```

### Test the Debug Endpoint:

```bash
# Start server in development
pnpm dev

# In another terminal, call the endpoint
curl http://localhost:3000/api/debug/db-health | jq

# Or open in browser
open http://localhost:3000/api/debug/db-health
```

---

**Schema drift will no longer go unnoticed!** 🎉
