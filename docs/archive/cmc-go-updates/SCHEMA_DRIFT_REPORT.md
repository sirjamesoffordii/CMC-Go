# Schema Drift Report

## Executive Summary
**Critical Drift Detected**: The current `drizzle/schema.ts` (source of truth for app) does NOT match the existing migration files. The migrations reflect an OLD schema structure that was replaced during MySQL migration. The app code expects the NEW schema structure.

---

## Breaking Mismatches

### 1. **people table** - COMPLETE STRUCTURE MISMATCH

**schema.ts expects:**
- `personId` varchar(64) NOT NULL UNIQUE (primary identifier)
- `primaryRole` varchar(255) nullable
- `primaryCampusId` int nullable
- `primaryDistrictId` varchar(64) nullable
- `primaryRegion` varchar(255) nullable
- `nationalCategory` varchar(255) nullable
- `status` enum('Yes','Maybe','No','Not Invited') default 'Not Invited'
- `depositPaid` boolean default false
- `statusLastUpdated` timestamp nullable
- `statusLastUpdatedBy` varchar(255) nullable
- `needs` text nullable
- `notes` text nullable
- `spouse` varchar(255) nullable
- `kids` varchar(10) nullable
- `guests` varchar(10) nullable
- `childrenAges` text nullable
- `lastEdited` timestamp nullable
- `lastEditedBy` varchar(255) nullable
- `createdAt` timestamp NOT NULL default now()

**Migration 0001 creates:**
- `id` int AUTO_INCREMENT PRIMARY KEY
- `name` varchar(255) NOT NULL
- `campusId` int NOT NULL (required, not nullable)
- `districtId` varchar(64) NOT NULL (required, not nullable)
- `status` enum('Not invited yet','Maybe','Going','Not Going') default 'Not invited yet'
- `role` varchar(255) nullable
- `lastUpdated` timestamp NOT NULL default now()
- `createdAt` timestamp NOT NULL default now()

**Migration 0004 adds:**
- `spouse`, `kids`, `guests`, `childrenAges`, `lastEdited`, `lastEditedBy` (assumes old structure exists)

**BREAKING ISSUES:**
- ❌ Missing `personId` column (app queries by `personId` varchar)
- ❌ Missing `primaryRole`, `primaryCampusId`, `primaryDistrictId`, `primaryRegion`, `nationalCategory`
- ❌ Wrong `status` enum values ('Not invited yet' vs 'Not Invited', 'Going' vs 'Yes', 'Not Going' vs 'No')
- ❌ `campusId` and `districtId` are required in migration, but nullable in schema
- ❌ Missing `depositPaid`, `statusLastUpdated`, `statusLastUpdatedBy`, `needs` columns
- ❌ Column name mismatch: `lastUpdated` (migration) vs `statusLastUpdated` (schema)

---

### 2. **needs table** - COMPLETE STRUCTURE MISMATCH

**schema.ts expects:**
- `id` int AUTO_INCREMENT PRIMARY KEY
- `personId` varchar(64) NOT NULL (references people.personId)
- `description` text NOT NULL
- `amount` int nullable (in cents)
- `createdAt` timestamp NOT NULL default now()

**Migration 0001 creates:**
- `id` int AUTO_INCREMENT PRIMARY KEY
- `personId` int NOT NULL (references people.id, not personId)
- `type` enum('Financial','Other') NOT NULL
- `amount` int nullable
- `notes` text nullable
- `isActive` boolean NOT NULL default true
- `createdAt` timestamp NOT NULL default now()

**BREAKING ISSUES:**
- ❌ `personId` type mismatch: int (migration) vs varchar(64) (schema)
- ❌ Missing `description` column (has `notes` instead)
- ❌ Missing `type` enum (schema doesn't have it)
- ❌ Missing `isActive` column (schema doesn't have it)

---

### 3. **notes table** - COMPLETE STRUCTURE MISMATCH

**schema.ts expects:**
- `id` int AUTO_INCREMENT PRIMARY KEY
- `personId` varchar(64) NOT NULL (references people.personId)
- `content` text NOT NULL
- `createdAt` timestamp NOT NULL default now()
- `createdBy` varchar(255) nullable

**Migration 0001 creates:**
- `id` int AUTO_INCREMENT PRIMARY KEY
- `personId` int NOT NULL (references people.id, not personId)
- `text` text NOT NULL
- `isLeaderOnly` boolean NOT NULL default false
- `createdAt` timestamp NOT NULL default now()

**BREAKING ISSUES:**
- ❌ `personId` type mismatch: int (migration) vs varchar(64) (schema)
- ❌ Column name mismatch: `text` (migration) vs `content` (schema)
- ❌ Missing `createdBy` column
- ❌ Missing `isLeaderOnly` column (schema doesn't have it)

---

### 4. **settings table** - PRIMARY KEY MISMATCH

**schema.ts expects:**
- `key` varchar(255) PRIMARY KEY
- `value` text nullable
- `updatedAt` timestamp NOT NULL default now() on update

**Migration 0003 creates:**
- `id` int AUTO_INCREMENT PRIMARY KEY
- `key` varchar(255) NOT NULL UNIQUE
- `value` text NOT NULL
- `updatedAt` timestamp NOT NULL default now() on update

**BREAKING ISSUES:**
- ❌ Primary key mismatch: `key` (schema) vs `id` (migration)
- ❌ `value` nullability: nullable (schema) vs NOT NULL (migration)

---

### 5. **users table** - MINOR TYPE MISMATCH

**schema.ts expects:**
- `name` varchar(255) nullable

**Migration 0000 creates:**
- `name` text nullable

**BREAKING ISSUES:**
- ⚠️ Type mismatch: varchar(255) vs text (may work but inconsistent)

---

### 6. **assignments table** - MISSING FROM MIGRATIONS

**schema.ts expects:**
- `assignments` table with columns: id, personId (varchar), assignmentType, roleTitle, campusId, districtId, region, isPrimary, createdAt

**Migrations:**
- ❌ Table does NOT exist in any migration file

---

## Seed Script Issues

**scripts/seed-data.sql:**
- ❌ Uses SQLite syntax (`INSERT OR IGNORE`, `strftime('%s', 'now')`)
- ❌ References old schema structure (`personId` as column name but expects different structure)
- ❌ Uses wrong status enum values
- ❌ References columns that don't exist in current schema (`statusLastUpdated` without `statusLastUpdatedBy`)

---

## Source of Truth Recommendation

**✅ schema.ts should be source of truth**

**Rationale:**
1. All application code (server/db.ts, server/routers.ts, client components) expects schema.ts structure
2. Code queries by `personId` (varchar), uses `primaryRole`, `primaryCampusId`, etc.
3. Code expects `status` enum values: 'Yes', 'Maybe', 'No', 'Not Invited'
4. Code expects `needs.description` and `notes.content` column names
5. Code expects `settings.key` as primary key

**Current State:**
- Migrations reflect OLD schema (pre-MySQL migration structure)
- schema.ts reflects NEW schema (current app expectations)
- Database likely has NEW structure (if migrations were manually fixed or DB was recreated)

---

## Files to Change (Next Step)

### 1. **drizzle/0001_dashing_dark_phoenix.sql** - REWRITE ENTIRELY
   - Replace `people` table creation with schema.ts structure
   - Replace `needs` table creation with schema.ts structure  
   - Replace `notes` table creation with schema.ts structure
   - Add `assignments` table creation

### 2. **drizzle/0003_flowery_master_mold.sql** - FIX settings table
   - Change primary key from `id` to `key`
   - Make `value` nullable
   - Remove `id` column

### 3. **drizzle/0004_add_person_fields.sql** - VERIFY/UPDATE
   - Verify it works with NEW people table structure (should be fine)
   - Ensure it references correct table structure

### 4. **drizzle/0000_chemical_tigra.sql** - MINOR FIX
   - Change `name` from `text` to `varchar(255)` (optional, low priority)

### 5. **scripts/seed-data.sql** - REWRITE FOR MYSQL
   - Convert SQLite syntax to MySQL
   - Update to match schema.ts structure
   - Use correct enum values
   - Use correct column names

### 6. **drizzle/meta/_journal.json** - UPDATE
   - Add entry for 0004 migration (if not already tracked)
   - May need to regenerate snapshots

### 7. **drizzle/meta/*_snapshot.json** - REGENERATE
   - Generate new snapshot matching schema.ts
   - Or delete and let drizzle-kit regenerate

---

## Risk Assessment

**HIGH RISK:**
- If database was manually migrated to match schema.ts, migrations are just documentation (low risk)
- If database still has old structure from migrations, app will CRASH on startup (high risk)

**RECOMMENDATION:**
1. Verify actual database structure matches schema.ts
2. If yes: Update migrations to match (documentation fix)
3. If no: Run new migrations to update database structure

---

## Next Steps Checklist

- [ ] Verify actual database schema (run `DESCRIBE` on each table)
- [ ] Update migration 0001 to match schema.ts
- [ ] Update migration 0003 to fix settings table
- [ ] Verify migration 0004 works with new structure
- [ ] Rewrite seed-data.sql for MySQL with correct schema
- [ ] Update/regenerate drizzle meta files
- [ ] Test migrations on clean database
- [ ] Update any remaining code references to old schema




