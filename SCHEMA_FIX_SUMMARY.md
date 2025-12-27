# Schema Fix Summary - Ready to Execute

## ✅ What Was Done

1. **Archived old migrations** → `drizzle/_old_migrations/`
2. **Created fresh migration** → `drizzle/0000_initial_schema.sql` (matches schema.ts exactly)
3. **Created migration runner** → `scripts/run-migrations.mjs`
4. **Updated package.json scripts**:
   - `db:generate` - Generate new migrations from schema.ts
   - `db:migrate` - Run migrations via script
   - `db:push` - Push schema directly (faster for fresh DB)
   - `db:setup` - Full setup (init + push + seed)
5. **Verified drizzle.config.ts** - ✅ Correctly configured for MySQL with DATABASE_URL

---

## 🚀 Commands to Run (Copy & Paste)

### Prerequisites Check:
```bash
# 1. Verify DATABASE_URL is set
echo $DATABASE_URL
# Should output: mysql://user:password@host:port/database

# 2. If not set, add to .env file:
# DATABASE_URL=mysql://user:password@host:port/database
```

### For FRESH/BLANK Database:

```bash
# Option A: Using db:push (recommended - faster, direct)
pnpm db:push

# Option B: Using db:migrate (uses migration files)
pnpm db:migrate

# Then seed (optional):
pnpm db:seed
```

### For EXISTING Database (⚠️ BACKUP FIRST!):

```bash
# 1. BACKUP YOUR DATABASE FIRST!
mysqldump -u user -p database_name > backup_$(date +%Y%m%d).sql

# 2. Option 1: Drop and recreate (DESTRUCTIVE)
# Drop all tables or recreate database, then:
pnpm db:push

# 3. Option 2: Manual data migration required
# You'll need custom scripts to transform old data to new schema
```

---

## 📋 Environment Requirements

1. **DATABASE_URL** must be set in `.env` or environment:
   ```
   DATABASE_URL=mysql://user:password@host:port/database
   ```

2. **MySQL/TiDB** server running and accessible

3. **Database exists** (create manually if needed):
   ```sql
   CREATE DATABASE your_database_name;
   ```

4. **User has permissions**: CREATE, ALTER, DROP, INSERT, SELECT

---

## 🔍 Verification After Migration

```bash
# Connect to your database and run:
mysql -u user -p database_name

# Then in MySQL:
DESCRIBE people;
DESCRIBE needs;
DESCRIBE notes;
DESCRIBE settings;
SHOW TABLES;
```

**Expected output:**
- `people` table should have: `personId` (varchar, unique), `primaryRole`, `primaryCampusId`, `status` enum('Yes','Maybe','No','Not Invited'), etc.
- `needs` table should have: `personId` (varchar), `description` (not `notes` or `type`)
- `notes` table should have: `personId` (varchar), `content` (not `text`)
- `settings` table should have: `key` as PRIMARY KEY (not `id`)
- `assignments` table should exist

---

## ⚠️ Breaking Changes

**This migration is NOT compatible with existing databases using the old schema.**

The schema structure is completely different:
- `people` table: Old structure vs New structure (incompatible)
- `needs` table: Different columns and types
- `notes` table: Different columns and types  
- `settings` table: Different primary key

**If you have existing data, you MUST:**
1. Backup the database
2. Write a data migration script to transform old → new structure
3. Or start with a fresh database

---

## 📁 Files Changed

### Created:
- ✅ `drizzle/0000_initial_schema.sql` - Fresh migration
- ✅ `scripts/run-migrations.mjs` - Migration runner
- ✅ `drizzle/meta/_journal.json` - Updated journal
- ✅ `MIGRATION_GUIDE.md` - Detailed guide
- ✅ `SCHEMA_DRIFT_REPORT.md` - Analysis report

### Modified:
- ✅ `package.json` - Updated scripts

### Archived:
- ✅ `drizzle/_old_migrations/` - All old migrations backed up here

---

## 🎯 Next Steps

1. **Set DATABASE_URL** in `.env` file
2. **Backup database** if it has existing data
3. **Run `pnpm db:push`** (for fresh DB) or `pnpm db:migrate`
4. **Verify schema** matches schema.ts
5. **Test the application**

---

## 🐛 Troubleshooting

**Error: "DATABASE_URL environment variable is required"**
→ Set DATABASE_URL in .env file

**Error: "Table already exists"**
→ Database has old schema, need to drop tables or use fresh DB

**Error: "Access denied"**
→ Check MySQL user permissions

**Error: "Unknown column 'personId'"**
→ Old schema still in database, need to run migration

---

## 📝 Notes

- `drizzle.config.ts` is correctly configured ✅
- Migration files now match `schema.ts` exactly ✅
- Scripts are ready to use ✅
- Old migrations are safely backed up ✅

**You're ready to run the migration!**




