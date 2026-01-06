# Final Verification Commands (Windows PowerShell)

## Prerequisites

1. **Set DATABASE_URL in `.env` file:**
   ```
   DATABASE_URL=mysql://user:password@host:port/database
   ```

2. **Ensure database exists:**
   ```sql
   CREATE DATABASE your_database_name;
   ```

---

## Step-by-Step Verification

### 1. Remove SQLite Dependency (if not already done)

```powershell
pnpm remove better-sqlite3
```

### 2. Setup Database (Blank Database)

```powershell
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

### 3. Verify Schema

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
   ...
✅ Schema check completed
```

### 4. Start Server (Includes Health Check)

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

### 5. Check Health Endpoint (In Another Terminal)

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/debug/db-health" | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Expected:** JSON with `"errors": []` and all tables showing `"exists": true`

### 6. Verify Table Counts (Connect to Database)

```sql
SELECT COUNT(*) as district_count FROM districts;
SELECT COUNT(*) as campus_count FROM campuses;
SELECT COUNT(*) as people_count FROM people;
SELECT COUNT(*) as needs_count FROM needs;
SELECT COUNT(*) as notes_count FROM notes;
SELECT COUNT(*) as assignments_count FROM assignments;
SELECT COUNT(*) as settings_count FROM settings;
```

**Expected (after seed):**
- districts: ~20
- campuses: ~40-60
- people: ~100-200
- needs: ~30-60
- notes: ~40-80
- assignments: ~60-120
- settings: 2

### 7. Test UI Create Operations

1. Open browser: `http://localhost:3000`
2. Navigate to a district panel
3. Create a new campus → Verify it appears
4. Create a new person → Verify it appears
5. Check database:
   ```sql
   SELECT * FROM campuses ORDER BY id DESC LIMIT 1;
   SELECT * FROM people ORDER BY id DESC LIMIT 1;
   ```

---

## Alternative Commands

### If db:setup fails, run steps individually:

```powershell
# 1. Initialize connection
pnpm db:init

# 2. Apply migrations
pnpm db:migrate

# 3. Seed data
pnpm db:seed
```

### If you need to reset database:

```powershell
# Truncate tables (keeps schema)
pnpm db:reset

# Drop and recreate (destructive)
pnpm db:reset:drop
```

### If you need to push schema directly (dev only):

```powershell
# Non-interactive push
pnpm db:push:yes
```

---

## Success Criteria Checklist

- [ ] `pnpm db:setup` completes without errors
- [ ] `pnpm db:check` shows all tables with required columns
- [ ] `pnpm dev` starts without health check errors
- [ ] Health endpoint returns `"errors": []`
- [ ] Table counts match expected values
- [ ] Can create campus from UI
- [ ] Can create person from UI
- [ ] Created records appear in database

---

## Troubleshooting

### Error: "DATABASE_URL environment variable is required"
- Create `.env` file in project root
- Add: `DATABASE_URL=mysql://user:password@host:port/database`

### Error: "Table 'X' does not exist"
- Run: `pnpm db:migrate`
- Or: `pnpm db:push:yes`

### Error: "Missing required columns"
- Run: `pnpm db:check` to see what's missing
- Run: `pnpm db:migrate` to apply migrations
- Or: `pnpm db:push:yes` to sync schema

### Server won't start - Health check fails
- This is expected - health check prevents starting with broken schema
- Fix schema issues first (see above)
- Then server will start

---

## All Done! ✅

If all steps complete successfully, the database layer is correctly configured and ready for development.

