# Database Setup Verification Guide

This guide provides step-by-step verification that the database layer is working correctly after setup.

## Prerequisites

1. **DATABASE_URL** must be set in `.env` file:
   ```
   DATABASE_URL=mysql://user:password@host:port/database
   ```

2. **Database must exist** (create manually if needed):
   ```sql
   CREATE DATABASE your_database_name;
   ```

3. **User must have permissions**: CREATE, ALTER, DROP, INSERT, SELECT, UPDATE, DELETE

---

## Step 1: Setup Database (Blank Database)

Run the setup command to create schema and seed data:

```powershell
# Windows PowerShell
pnpm db:setup
```

**Expected Output:**
```
✓ Connected to MySQL database
📄 Running 0000_initial_schema.sql...
✓ Applied 0000_initial_schema.sql
✅ All migrations completed successfully!
🌱 Seeding MySQL database with dev data...
✅ Seed completed successfully!
```

**If you see errors:**
- Check DATABASE_URL is correct
- Verify database exists
- Check user permissions
- Review error messages for specific issues

---

## Step 2: Verify Server Starts

Start the development server:

```powershell
pnpm dev
```

**Expected Output:**
```
[DB Health] Performing startup database health check...
[DB Health] ✅ Database health check passed
[DB Health] Tables checked: 7
[DB Health] Tables with data: X
[Database] Connected to MySQL/TiDB with connection pool
Server running on http://localhost:3000/
```

**If health check fails:**
- Run `pnpm db:check` to see detailed schema issues
- Verify migrations ran: `pnpm db:migrate`
- Check error messages for missing tables/columns

---

## Step 3: Verify Database Health Endpoint (Development Only)

In development mode, check the health endpoint:

```powershell
# Using PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/debug/db-health" | Select-Object -ExpandProperty Content
```

**Expected Response:**
```json
{
  "success": true,
  "connected": true,
  "drizzleMigrationsTableExists": true,
  "tables": {
    "districts": { "exists": true, "rowCount": 20, ... },
    "campuses": { "exists": true, "rowCount": 40, ... },
    "people": { "exists": true, "rowCount": 150, ... },
    ...
  },
  "errors": [],
  "warnings": []
}
```

---

## Step 4: Verify Table Counts

Connect to your database and run these SQL queries:

```sql
-- Check table counts
SELECT COUNT(*) as district_count FROM districts;
SELECT COUNT(*) as campus_count FROM campuses;
SELECT COUNT(*) as people_count FROM people;
SELECT COUNT(*) as needs_count FROM needs;
SELECT COUNT(*) as notes_count FROM notes;
SELECT COUNT(*) as assignments_count FROM assignments;
SELECT COUNT(*) as settings_count FROM settings;
```

**Expected Results (after seed):**
- `districts`: ~20 rows
- `campuses`: ~40-60 rows
- `people`: ~100-200 rows
- `needs`: ~30-60 rows
- `notes`: ~40-80 rows
- `assignments`: ~60-120 rows
- `settings`: 2 rows

---

## Step 5: Test UI Create Operations

### Test Creating a Campus

1. Open the application in browser: `http://localhost:3000`
2. Navigate to a district panel
3. Create a new campus
4. Verify it appears in the UI
5. Check database:
   ```sql
   SELECT * FROM campuses ORDER BY id DESC LIMIT 1;
   ```
   Should show the newly created campus with correct `name` and `districtId`.

### Test Creating a Person

1. Open the application in browser
2. Navigate to district or campus panel
3. Create a new person
4. Verify it appears in the UI
5. Check database:
   ```sql
   SELECT * FROM people ORDER BY id DESC LIMIT 1;
   ```
   Should show the newly created person with correct `personId`, `name`, `status`, etc.

**If create operations fail:**
- Check browser console for errors
- Check server logs for database errors
- Verify `createPerson` and `createCampus` return insertId correctly
- Check that required fields are being sent from UI

---

## Step 6: Verify Schema Matches drizzle/schema.ts

Run the schema check script:

```powershell
pnpm db:check
```

**Expected Output:**
```
✓ Connected to database

📋 Checking tables...

✅ Table 'districts' exists (5 columns)
   Columns: id, name, region, leftNeighbor, rightNeighbor
   ✓ All required columns present
✅ Table 'campuses' exists (3 columns)
   Columns: id, name, districtId
   ✓ All required columns present
✅ Table 'people' exists (20 columns)
   Columns: id, personId, name, primaryRole, primaryCampusId, primaryDistrictId, primaryRegion, nationalCategory, status, depositPaid, statusLastUpdated, statusLastUpdatedBy, needs, notes, spouse, kids, guests, childrenAges, lastEdited, lastEditedBy, createdAt
   ✓ All required columns present
...
✅ Schema check completed
```

**If columns are missing:**
- Run `pnpm db:migrate` to apply migrations
- Or run `pnpm db:push:yes` to push schema directly
- Verify `drizzle/schema.ts` matches what you expect

---

## Troubleshooting

### Error: "DATABASE_URL environment variable is required"
- Create `.env` file in project root
- Add: `DATABASE_URL=mysql://user:password@host:port/database`

### Error: "Table 'X' does not exist"
- Run: `pnpm db:migrate`
- Or: `pnpm db:push:yes`
- Verify migrations ran successfully

### Error: "Missing required columns"
- Check `drizzle/schema.ts` for expected columns
- Run: `pnpm db:generate` then `pnpm db:migrate`
- Or: `pnpm db:push:yes` to sync schema

### Error: "Failed to get insert ID from database"
- Check that `createPerson`/`createCampus` return `result[0].insertId`
- Verify MySQL connection is working
- Check server logs for detailed error messages

### Server won't start after health check fails
- This is expected behavior - health check prevents starting with broken schema
- Fix schema issues first, then server will start
- Run `pnpm db:check` to see what's wrong

---

## Quick Verification Commands

```powershell
# 1. Check schema
pnpm db:check

# 2. Verify migrations
pnpm db:migrate

# 3. Start server (includes health check)
pnpm dev

# 4. Check health endpoint (in another terminal)
Invoke-WebRequest -Uri "http://localhost:3000/api/debug/db-health"
```

---

## Success Criteria

✅ All 7 critical tables exist  
✅ All critical columns exist in each table  
✅ Server starts without health check errors  
✅ Health endpoint returns `errors: []`  
✅ Can create campus from UI and see it in database  
✅ Can create person from UI and see it in database  
✅ Table counts match expected values after seed  

If all criteria pass, the database layer is correctly configured! 🎉

