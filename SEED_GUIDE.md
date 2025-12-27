# Seed Script Guide - MySQL Compatible

## ✅ What Was Done

1. **Created comprehensive seed script** → `scripts/seed-mysql-dev.mjs`
   - Matches `drizzle/schema.ts` exactly
   - Seeds all tables: districts, campuses, people, needs, notes, assignments, settings
   - Uses correct status enum values: `"Yes"`, `"Maybe"`, `"No"`, `"Not Invited"`
   - Uses `personId` as varchar (not int)
   - Uses correct column names: `description` (needs), `content` (notes)
   - Inserts in correct order: districts → campuses → people → needs → notes → assignments → settings

2. **Archived old seed script** → `scripts/_old/seed-data.sql`
   - Old SQLite-flavored script (uses `INSERT OR IGNORE`, `strftime`, etc.)

3. **Verified package.json** → `db:seed` script already points to `seed-mysql-dev.mjs` ✅

---

## 🚀 Commands to Run

### Prerequisites:
```bash
# 1. Ensure DATABASE_URL is set in .env file
# Format: DATABASE_URL=mysql://user:password@host:port/database

# 2. Database schema must exist (run migration first)
pnpm db:push
# OR
pnpm db:migrate
```

### Run Seed:
```bash
# Seed the database with dev data
pnpm db:seed
```

### Full Setup (init + schema + seed):
```bash
pnpm db:setup
```

---

## 📋 What Gets Seeded

### Districts
- First 20 districts from `scripts/seed-districts.json`
- Includes: id, name, region

### Campuses
- 2-3 campuses per district (generated)
- Total: ~40-60 campuses
- Includes: name, districtId

### People
- 5-10 people per district
- Total: ~100-200 people
- Includes all fields from schema.ts:
  - `personId` (varchar, unique)
  - `name`, `primaryRole`, `primaryCampusId`, `primaryDistrictId`, `primaryRegion`
  - `status` (enum: "Yes", "Maybe", "No", "Not Invited")
  - `depositPaid` (boolean)
  - `spouse`, `kids`, `guests` (some people have these)
  - `createdAt`, `statusLastUpdated`

### Needs
- ~30% of people have needs
- Includes: `personId` (varchar), `description`, `amount` (in cents)

### Notes
- ~40% of people have notes
- Includes: `personId` (varchar), `content`, `createdBy`

### Assignments
- ~60% of people have assignments
- Includes: `personId` (varchar), `assignmentType`, `roleTitle`, `campusId`, `districtId`, `region`, `isPrimary`

### Settings
- Default app settings
- Includes: `app_version`, `last_updated`

---

## 🔍 Verification Commands

After running the seed, verify the data:

```sql
-- Connect to your database
mysql -u user -p database_name

-- Check counts
SELECT COUNT(*) as district_count FROM districts;
SELECT COUNT(*) as campus_count FROM campuses;
SELECT COUNT(*) as people_count FROM people;
SELECT COUNT(*) as needs_count FROM needs;
SELECT COUNT(*) as notes_count FROM notes;
SELECT COUNT(*) as assignments_count FROM assignments;
SELECT COUNT(*) as settings_count FROM settings;

-- Check status distribution
SELECT status, COUNT(*) as count 
FROM people 
GROUP BY status;

-- Verify personId is varchar and unique
DESCRIBE people;
SHOW INDEXES FROM people WHERE Key_name = 'people_personId_unique';

-- Check needs table structure
DESCRIBE needs;
SELECT personId, description, amount FROM needs LIMIT 5;

-- Check notes table structure
DESCRIBE notes;
SELECT personId, content FROM notes LIMIT 5;
```

**Expected output:**
- Districts: ~20
- Campuses: ~40-60
- People: ~100-200
- Needs: ~30-60
- Notes: ~40-80
- Assignments: ~60-120
- Settings: 2

---

## 📝 Schema Alignment

The seed script matches `drizzle/schema.ts` exactly:

✅ **Status enum**: `"Yes" | "Maybe" | "No" | "Not Invited"`  
✅ **personId**: `varchar(64)` (not int)  
✅ **needs.description**: `text` (not `notes` or `type`)  
✅ **notes.content**: `text` (not `text` field with different name)  
✅ **campuses.districtId**: `varchar(64)` (matches districts.id)  
✅ **All foreign keys**: Use `personId` varchar consistently  
✅ **Insert order**: Respects foreign key dependencies  

---

## ⚠️ Important Notes

1. **Production Safeguard**: Script will not run if `APP_ENV=production`
2. **Duplicate Handling**: Uses `onDuplicateKeyUpdate` for MySQL compatibility
3. **Random Data**: Uses deterministic random generation for consistency
4. **Foreign Keys**: All references use correct types (varchar for personId, int for campusId)

---

## 🐛 Troubleshooting

**Error: "DATABASE_URL environment variable is required"**
→ Set DATABASE_URL in .env file

**Error: "Table doesn't exist"**
→ Run `pnpm db:push` or `pnpm db:migrate` first

**Error: "Unknown column 'personId'"**
→ Schema mismatch, ensure migrations are up to date

**Error: "Cannot run seed script in production"**
→ Set `APP_ENV` to something other than "production"

---

## 📁 Files Changed

### Created/Updated:
- ✅ `scripts/seed-mysql-dev.mjs` - Comprehensive MySQL seed script

### Archived:
- ✅ `scripts/_old/seed-data.sql` - Old SQLite seed script

### Verified:
- ✅ `package.json` - `db:seed` script already correct

---

## 🎯 Next Steps

1. **Set DATABASE_URL** in `.env` file
2. **Run migrations** (`pnpm db:push` or `pnpm db:migrate`)
3. **Run seed** (`pnpm db:seed`)
4. **Verify data** using SQL queries above
5. **Test the application**

---

**The seed script is ready to use!** 🎉




