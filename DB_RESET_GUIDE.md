# Database Reset Guide

## ✅ What Was Added

A clean local database reset flow that:

1. **Safely resets the database** - Truncates all tables in proper order (respecting foreign keys)
2. **Optional drop/recreate** - Can drop and recreate the entire database (if you have permissions)
3. **Runs migrations** - Automatically applies schema migrations
4. **Runs seed** - Automatically seeds with dev data
5. **Development-only** - Blocked in production environments

---

## 🚀 Commands

### Basic Reset (Truncate Tables)

```bash
pnpm db:reset
```

This will:
1. ✅ Truncate all tables in proper order (respecting foreign keys)
2. ✅ Run migrations (`pnpm db:push`)
3. ✅ Run seed (`pnpm db:seed`)

**Safe for:** Users without DROP DATABASE permissions

### Full Reset (Drop & Recreate Database)

```bash
pnpm db:reset:drop
# OR
pnpm db:reset --drop-db
```

This will:
1. ✅ Drop the entire database
2. ✅ Recreate the database
3. ✅ Run migrations (`pnpm db:push`)
4. ✅ Run seed (`pnpm db:seed`)

**Requires:** DROP DATABASE and CREATE DATABASE permissions

**Note:** If you don't have permissions, it will automatically fall back to truncation.

---

## 📋 What Gets Reset

### Tables Truncated (in order):
1. `notes` - References people
2. `needs` - References people
3. `assignments` - References people, campuses, districts
4. `people` - References campuses, districts
5. `campuses` - References districts
6. `districts` - No dependencies
7. `settings` - No dependencies
8. `users` - No dependencies

### Tables Preserved:
- `drizzle_migrations` - Migration history is kept

---

## ⚠️ Warnings

### Production Safety

The script will **NOT run** if:
- `NODE_ENV === "production"` OR
- `APP_ENV === "production"`

**Error message:**
```
❌ Cannot reset database in production environment!
Set NODE_ENV and APP_ENV to something other than 'production' to proceed.
```

### Data Loss Warning

The script will show a warning before proceeding:
```
🔄 Starting database reset...

⚠️  WARNING: This will delete all data in the database!
   Database: your_database_name
```

---

## 📊 Example Output

### Successful Reset (Truncate):

```bash
$ pnpm db:reset

🔄 Starting database reset...

⚠️  WARNING: This will delete all data in the database!
   Database: cmc_go

🗑️  Truncating all tables...
  ✓ Truncated notes
  ✓ Truncated needs
  ✓ Truncated assignments
  ✓ Truncated people
  ✓ Truncated campuses
  ✓ Truncated districts
  ✓ Truncated settings
  ✓ Truncated users
✅ All tables truncated

📦 Running migrations...
[Database] Connected to MySQL/TiDB with connection pool
✅ Migrations completed

🌱 Seeding database...
🌱 Seeding MySQL database with dev data...
✅ Seed completed

✅ Database reset completed successfully!

📊 Summary:
   - Database: cmc_go
   - Method: Truncate Tables
   - Migrations: Applied
   - Seed: Completed
```

### Successful Reset (Drop & Recreate):

```bash
$ pnpm db:reset:drop

🔄 Starting database reset...

⚠️  WARNING: This will delete all data in the database!
   Database: cmc_go

🗑️  Dropping and recreating database...
  ✓ Dropped database cmc_go
  ✓ Created database cmc_go

📦 Running migrations...
✅ Migrations completed

🌱 Seeding database...
✅ Seed completed

✅ Database reset completed successfully!

📊 Summary:
   - Database: cmc_go
   - Method: Drop & Recreate
   - Migrations: Applied
   - Seed: Completed
```

### Permission Denied (Auto Fallback):

```bash
$ pnpm db:reset:drop

🔄 Starting database reset...

⚠️  WARNING: This will delete all data in the database!
   Database: cmc_go

🗑️  Dropping and recreating database...
❌ Permission denied: Cannot drop/create database
   Your user doesn't have DROP/CREATE DATABASE permissions.
   Falling back to table truncation instead...

🗑️  Truncating all tables...
  ✓ Truncated notes
  ...
✅ All tables truncated

📦 Running migrations...
✅ Migrations completed

🌱 Seeding database...
✅ Seed completed
```

---

## 🔧 Troubleshooting

### Error: "Cannot reset database in production"

**Solution:** Ensure `NODE_ENV` and `APP_ENV` are not set to "production"

```bash
# Check your environment
echo $NODE_ENV
echo $APP_ENV

# If they're set to production, unset them or set to development
export NODE_ENV=development
export APP_ENV=development
```

### Error: "Permission denied: Cannot drop/create database"

**Solution:** This is expected if you don't have DROP/CREATE permissions. The script will automatically fall back to truncation, which is safe and works without special permissions.

### Error: "DATABASE_URL environment variable is required"

**Solution:** Set `DATABASE_URL` in your `.env` file:
```
DATABASE_URL=mysql://user:password@host:port/database
```

### Error: "Failed to truncate table X"

**Solution:** This might happen if:
- Table doesn't exist (this is okay, script will skip it)
- Foreign key constraints are preventing truncation (script disables FK checks temporarily)

If you see persistent errors, check your database connection and permissions.

---

## 🎯 Use Cases

### Quick Local Development Reset

```bash
# Reset everything and start fresh
pnpm db:reset
```

### After Schema Changes

```bash
# If you've changed schema.ts, reset to apply changes
pnpm db:reset
```

### Clean Slate (Full Reset)

```bash
# Drop everything and recreate from scratch
pnpm db:reset:drop
```

### After Pulling New Migrations

```bash
# If you pulled new migrations, reset to apply them
pnpm db:reset
```

---

## 🔍 What Happens Step-by-Step

1. **Environment Check**
   - Verifies not in production
   - Checks DATABASE_URL is set

2. **Data Deletion**
   - **Option A (--drop-db):** Drops and recreates database
   - **Option B (default):** Truncates all tables in proper order
   - Preserves `drizzle_migrations` table

3. **Schema Application**
   - Runs `pnpm db:push` to apply schema from `schema.ts`

4. **Data Seeding**
   - Runs `pnpm db:seed` to populate with dev data

5. **Summary**
   - Shows what was done and confirms success

---

## 📁 Files Created

- ✅ `scripts/reset-db.mjs` - Main reset script
- ✅ `DB_RESET_GUIDE.md` - This documentation

### Files Modified

- ✅ `package.json` - Added `db:reset` and `db:reset:drop` scripts

---

## 🛡️ Safety Features

1. **Production Blocking** - Won't run in production
2. **Permission Handling** - Auto-falls back to truncation if no DROP permissions
3. **Foreign Key Safety** - Disables FK checks during truncation, re-enables after
4. **Migration History Preserved** - Keeps `drizzle_migrations` table
5. **Clear Warnings** - Shows what will be deleted before proceeding

---

## 💡 Tips

1. **Use truncation by default** - It's safer and works without special permissions
2. **Use drop/recreate for clean slate** - If you want to ensure everything is completely fresh
3. **Check your environment** - Make sure you're not accidentally in production
4. **Backup if needed** - The script doesn't backup, so backup manually if you need to preserve data

---

**Your database reset flow is ready!** 🎉

