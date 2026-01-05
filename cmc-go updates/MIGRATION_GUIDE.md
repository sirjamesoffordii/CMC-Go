# Migration Guide - Schema.ts as Source of Truth

## ✅ Completed Actions

1. **Archived old migrations** → `drizzle/_old_migrations/`
2. **Created fresh initial migration** → `drizzle/0000_initial_schema.sql` (matches schema.ts)
3. **Updated package.json scripts**:
   - `db:generate` - Generate migrations from schema.ts
   - `db:migrate` - Run migrations using scripts/run-migrations.mjs
   - `db:push` - Push schema directly (drizzle-kit push)
   - `db:init` - Initialize database connection
   - `db:seed` - Seed database with sample data
   - `db:setup` - Full setup (init + push + seed)
4. **Created migration runner** → `scripts/run-migrations.mjs`
5. **Verified drizzle.config.ts** - Already correctly configured for MySQL

---

## 🚨 BREAKING CHANGES WARNING

**If your database already has data, you MUST backup first!**

The new migration creates a completely different schema structure:
- `people` table structure is completely different
- `needs` table structure is different
- `notes` table structure is different
- `settings` table primary key changed
- New `assignments` table added

**This migration will NOT work on an existing database with the old schema.**

---

## 📋 Commands to Run

### For a **BLANK/Fresh Database**:

```bash
# 1. Ensure DATABASE_URL is set in .env
#    Format: mysql://user:password@host:port/database

# 2. Initialize database (creates connection, doesn't create schema)
pnpm db:init

# 3. Push schema directly (recommended for fresh DB)
pnpm db:push

# OR run migrations (alternative approach)
pnpm db:migrate

# 4. Seed with sample data (optional)
pnpm db:seed

# OR do everything at once
pnpm db:setup
```

### For an **EXISTING Database** (with old schema):

**⚠️ YOU MUST BACKUP YOUR DATABASE FIRST!**

```bash
# Option 1: Drop and recreate (DESTRUCTIVE - loses all data)
# 1. Backup your database
# 2. Drop all tables or recreate database
# 3. Then run:
pnpm db:push

# Option 2: Manual migration (preserve data)
# You'll need to write a custom migration script to:
# 1. Rename/migrate old columns to new structure
# 2. Transform data (e.g., status enum values)
# 3. Add new columns
# 4. Drop old columns
# This is complex and requires careful data mapping
```

---

## 🔧 Environment Requirements

1. **DATABASE_URL** environment variable must be set:
   ```
   DATABASE_URL=mysql://user:password@host:port/database
   ```

2. **MySQL/TiDB** database server running and accessible

3. **Database must exist** (create it manually if needed):
   ```sql
   CREATE DATABASE cmc_go;
   ```

4. **User must have CREATE/ALTER/DROP permissions**

---

## 📁 File Changes Summary

### Created:
- `drizzle/0000_initial_schema.sql` - Fresh migration matching schema.ts
- `scripts/run-migrations.mjs` - Migration runner script
- `drizzle/meta/_journal.json` - Updated journal
- `drizzle/_old_migrations/` - Backup of old migrations

### Modified:
- `package.json` - Updated db scripts

### Archived:
- `drizzle/_old_migrations/0000_chemical_tigra.sql`
- `drizzle/_old_migrations/0001_dashing_dark_phoenix.sql`
- `drizzle/_old_migrations/0002_lying_ink.sql`
- `drizzle/_old_migrations/0003_flowery_master_mold.sql`
- `drizzle/_old_migrations/0004_add_person_fields.sql`
- `drizzle/_old_migrations/meta/` - Old meta files

---

## 🧪 Testing the Migration

### Test on a blank database:

```bash
# 1. Create a test database
mysql -u root -p -e "CREATE DATABASE cmc_go_test;"

# 2. Set DATABASE_URL to test DB
export DATABASE_URL="mysql://user:password@localhost:3306/cmc_go_test"

# 3. Run migration
pnpm db:push

# 4. Verify schema
mysql -u root -p cmc_go_test -e "DESCRIBE people;"
mysql -u root -p cmc_go_test -e "DESCRIBE needs;"
mysql -u root -p cmc_go_test -e "DESCRIBE notes;"
mysql -u root -p cmc_go_test -e "DESCRIBE settings;"
```

---

## 📝 Next Steps

1. **Verify your database is blank or backed up**
2. **Set DATABASE_URL in .env file**
3. **Run `pnpm db:push` or `pnpm db:migrate`**
4. **Verify tables match schema.ts structure**
5. **Run `pnpm db:seed` if you want sample data**
6. **Test the application**

---

## 🔍 Verification Commands

After running migrations, verify the schema:

```sql
-- Check people table structure
DESCRIBE people;
SHOW COLUMNS FROM people;

-- Verify personId is unique
SHOW INDEXES FROM people WHERE Key_name = 'people_personId_unique';

-- Check status enum values
SHOW COLUMNS FROM people WHERE Field = 'status';

-- Check all tables exist
SHOW TABLES;
```

Expected tables:
- users
- districts
- campuses
- people
- assignments
- needs
- notes
- settings

---

## ⚠️ Troubleshooting

### Error: "Table already exists"
- Database has old schema
- Solution: Drop tables or use fresh database

### Error: "Unknown column 'personId'"
- Old schema still in database
- Solution: Run migration or drop/recreate

### Error: "DATABASE_URL not set"
- Set it in .env file or export as environment variable

### Error: "Access denied"
- Check MySQL user permissions
- User needs CREATE, ALTER, DROP, INSERT, SELECT permissions




