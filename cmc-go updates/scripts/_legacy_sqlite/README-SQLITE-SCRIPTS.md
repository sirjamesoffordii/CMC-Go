# SQLite-Only Scripts

⚠️ **WARNING: These scripts are for SQLite only and should NOT be used with MySQL setup.**

The following scripts use SQLite (`better-sqlite3`) and are incompatible with the MySQL database setup:

## SQLite-Only Scripts

1. **`init-db.mjs`** - SQLite database initialization
   - Uses: `better-sqlite3`
   - Creates SQLite database at `./data/cmc_go.db`
   - **DO NOT USE** - Use `init-mysql-db.mjs` instead

2. **`seed-dev.mjs`** - SQLite seed script
   - Uses: `drizzle-orm/better-sqlite3`
   - Seeds SQLite database with dev data
   - **DO NOT USE** - Use `seed-mysql-dev.mjs` instead

3. **`seed-sqlite-cli.mjs`** - SQLite CLI-based seed script
   - Uses: `sqlite3` command-line tool
   - **DO NOT USE** - Use `seed-mysql-dev.mjs` instead

4. **`seed-sqlite.mjs`** - Alternative SQLite seed script
   - Uses: `drizzle-orm/better-sqlite3`
   - **DO NOT USE** - Use `seed-mysql-dev.mjs` instead

5. **`migrate-district-names.mjs`** - SQLite migration script
   - Uses: `better-sqlite3`
   - Migrates district names in SQLite database
   - **DO NOT USE** with MySQL (MySQL uses different migration approach)

6. **`migrate-to-mysql.mjs`** - One-time migration script
   - Reads from SQLite, writes to MySQL
   - **One-time use only** - Already completed

## MySQL-Compatible Scripts (Use These)

✅ **`init-mysql-db.mjs`** - MySQL database initialization  
✅ **`seed-mysql-dev.mjs`** - MySQL seed script  
✅ **`populate-db.mjs`** - Generic populate script (check for SQLite usage)

## Package.json Scripts

The following npm scripts are configured for MySQL:
- `pnpm db:init` → uses `init-mysql-db.mjs`
- `pnpm db:seed` → uses `seed-mysql-dev.mjs`
- `pnpm db:setup` → uses MySQL scripts
- `pnpm db:push` → uses Drizzle with MySQL dialect

