# Schema Guardrails Summary

## ✅ Implementation Complete

Guardrails have been added to prevent silent schema drift. The system will now:

1. **Check database health at startup** - Server won't start if critical schema issues are detected
2. **Provide debug endpoint** - Development-only endpoint to check database health anytime
3. **Show clear error messages** - Actionable errors that tell you exactly what's wrong and how to fix it

---

## 📁 Files Changed

### Created:
- ✅ `server/_core/db-health.ts` - Database health check functions
- ✅ `DB_HEALTH_GUARDRAILS.md` - Detailed documentation
- ✅ `SCHEMA_GUARDRAILS_SUMMARY.md` - This file

### Modified:
- ✅ `server/_core/index.ts` - Added startup check and debug endpoint
- ✅ `server/db.ts` - Added `getPool()` export for raw queries

---

## 🚀 How to Use

### Startup Check (Automatic)

The check runs automatically when you start the server:

```bash
pnpm dev
```

**Success Output:**
```
[DB Health] Performing startup database health check...
[DB Health] ✅ Database health check passed
[DB Health] Tables checked: 7
[DB Health] Tables with data: 5
[Database] Connected to MySQL/TiDB with connection pool
Server running on http://localhost:3000/
```

**Failure Output:**
```
[DB Health] Performing startup database health check...
[DB Health] ❌ CRITICAL: Schema drift detected!
[DB Health] Errors: 
  - Critical table 'people' does not exist
  - Table 'districts' is missing required columns: region
[Startup] Database health check failed. Server will not start.
[Startup] Fix the database schema issues and try again.
```

### Debug Endpoint (Development Only)

**Endpoint:** `GET /api/debug/db-health`

**Call it:**
```bash
# Using curl
curl http://localhost:3000/api/debug/db-health

# Or open in browser
http://localhost:3000/api/debug/db-health
```

**Example Response:**
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
        "region": "Big Sky"
      }
    },
    "people": {
      "exists": true,
      "columnCount": 18,
      "rowCount": 150,
      "columns": ["id", "personId", "name", "status", ...]
    }
  },
  "errors": [],
  "warnings": []
}
```

---

## 🔍 What Gets Checked

### Critical Tables:
- `districts`
- `campuses`
- `people`
- `needs`
- `notes`
- `assignments`
- `settings`

### Critical Columns Per Table:
- **people**: `personId`, `name`, `status`, `primaryDistrictId`, `primaryRegion`
- **districts**: `id`, `name`, `region`
- **campuses**: `id`, `name`, `districtId`
- **needs**: `id`, `personId`, `description`
- **notes**: `id`, `personId`, `content`
- **assignments**: `id`, `personId`, `assignmentType`
- **settings**: `key`, `value`

### Additional Checks:
- Database connection
- `drizzle_migrations` table existence
- Table row counts (warnings if empty)

---

## 🛡️ Safety Features

1. **Production Safe:**
   - Debug endpoint disabled in production (`NODE_ENV !== "production"`)
   - Startup check runs in all environments (prevents broken deployments)

2. **Non-Blocking Warnings:**
   - Empty tables = warning (not error)
   - Missing migrations table = warning (not error)

3. **Clear Error Messages:**
   - Errors tell you exactly what's wrong
   - Errors suggest how to fix it

---

## 🔧 Fixing Issues

If the startup check fails:

1. **Read the error messages** - They tell you exactly what's missing
2. **Run migrations:**
   ```bash
   pnpm db:push
   # OR
   pnpm db:migrate
   ```
3. **Restart the server:**
   ```bash
   pnpm dev
   ```

---

## 📊 Example Scenarios

### Scenario 1: Missing Table
```
[DB Health] ❌ CRITICAL: Schema drift detected!
[DB Health] Errors: Critical table 'people' does not exist
```
**Fix:** Run `pnpm db:push`

### Scenario 2: Missing Column
```
[DB Health] ❌ CRITICAL: Schema drift detected!
[DB Health] Errors: Table 'people' is missing required columns: personId
```
**Fix:** Run `pnpm db:push` to sync schema

### Scenario 3: Connection Failed
```
[DB Health] ❌ CRITICAL: Database connection failed!
[DB Health] Errors: Access denied for user...
```
**Fix:** Check `DATABASE_URL` in `.env` file

### Scenario 4: Empty Tables (Warning Only)
```
[DB Health] ⚠️  Warnings: Table 'needs' exists but is empty
```
**Fix:** This is just a warning - run `pnpm db:seed` if you want sample data

---

## 🎯 Benefits

1. **Prevents Silent Failures** - Server won't start if schema is broken
2. **Early Detection** - Catches issues before users see errors
3. **Developer Friendly** - Clear, actionable error messages
4. **Production Safe** - Debug endpoint disabled in production

---

**Schema drift will no longer go unnoticed!** 🎉




