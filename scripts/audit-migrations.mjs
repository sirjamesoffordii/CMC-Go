#!/usr/bin/env node
/**
 * MIGRATION AUDIT SCRIPT
 *
 * Audits migration files to verify they match the current schema.
 * Reports if any tables/columns exist in the database but are NOT represented in migrations.
 *
 * Usage:
 *   pnpm db:audit
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

/**
 * Extract table names from migration SQL
 */
function extractTablesFromMigration(sqlContent) {
  const tables = new Set();

  // Match CREATE TABLE statements
  const createTableRegex = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?/gi;
  let match;
  while ((match = createTableRegex.exec(sqlContent)) !== null) {
    tables.add(match[1]);
  }

  // Match ALTER TABLE statements (to find tables being modified)
  const alterTableRegex = /ALTER TABLE\s+`?(\w+)`?/gi;
  while ((match = alterTableRegex.exec(sqlContent)) !== null) {
    tables.add(match[1]);
  }

  return Array.from(tables);
}

/**
 * Extract column names from migration SQL for a specific table
 */
function extractColumnsFromMigration(sqlContent, tableName) {
  const columns = new Set();
  let match;

  // Match column definitions in CREATE TABLE
  const createTableMatch = sqlContent.match(
    new RegExp(
      `CREATE TABLE[\\s\\S]*?\\\`?${tableName}\\\`?[\\s\\S]*?\\(([\\s\\S]*?)\\)`,
      "i"
    )
  );

  if (createTableMatch) {
    const columnDefs = createTableMatch[1];
    const columnRegex = /`?(\w+)`?\s+/g;
    while ((match = columnRegex.exec(columnDefs)) !== null) {
      columns.add(match[1]);
    }
  }

  // Match ALTER TABLE ADD COLUMN statements
  const alterAddRegex = new RegExp(
    `ALTER TABLE\\s+\\\`?${tableName}\\\`?\\s+ADD COLUMN\\s+\\\`?(\\w+)\\\`?`,
    "gi"
  );
  while ((match = alterAddRegex.exec(sqlContent)) !== null) {
    columns.add(match[1]);
  }

  return Array.from(columns);
}

async function auditMigrations() {
  let connection;

  try {
    console.log("🔍 Auditing migrations...\n");

    // Connect to database
    connection = await mysql.createConnection(connectionString);
    console.log("✓ Connected to database\n");

    // Get all migration files
    const migrationsDir = join(projectRoot, "drizzle", "migrations");
    let migrationFiles = [];

    try {
      migrationFiles = readdirSync(migrationsDir)
        .filter(f => f.endsWith(".sql"))
        .sort();
    } catch (_error) {
      console.warn(
        "⚠️  Migrations directory not found or empty:",
        migrationsDir
      );
      console.warn("   Run 'pnpm db:generate' to create migrations\n");
    }

    if (migrationFiles.length === 0) {
      console.log("⚠️  No migration files found");
      console.log(
        "   This is expected if migrations haven't been generated yet."
      );
      console.log(
        "   Run 'pnpm db:generate' to create migrations from schema.ts\n"
      );
      return;
    }

    console.log(`Found ${migrationFiles.length} migration file(s):`);
    migrationFiles.forEach(f => console.log(`  - ${f}`));
    console.log();

    // Extract all tables and columns from migrations
    const migrationTables = new Set();
    const migrationColumns = new Map(); // table -> Set of columns

    for (const file of migrationFiles) {
      const filePath = join(migrationsDir, file);
      const content = readFileSync(filePath, "utf-8");
      const tables = extractTablesFromMigration(content);

      tables.forEach(table => {
        migrationTables.add(table);
        if (!migrationColumns.has(table)) {
          migrationColumns.set(table, new Set());
        }
        const cols = extractColumnsFromMigration(content, table);
        cols.forEach(col => migrationColumns.get(table).add(col));
      });
    }

    console.log(`Migration files reference ${migrationTables.size} table(s):`);
    Array.from(migrationTables)
      .sort()
      .forEach(t => console.log(`  - ${t}`));
    console.log();

    // Get actual tables from database
    const [dbTables] = await connection.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'"
    );

    const actualTables = dbTables.map(r => r.table_name);
    console.log(`Database has ${actualTables.length} table(s):`);
    actualTables.sort().forEach(t => console.log(`  - ${t}`));
    console.log();

    // Find tables in DB but not in migrations
    const tablesNotInMigrations = actualTables.filter(
      t => !migrationTables.has(t) && t !== "drizzle_migrations"
    );

    if (tablesNotInMigrations.length > 0) {
      console.log("⚠️  WARNING: Tables in database but NOT in migrations:");
      tablesNotInMigrations.forEach(t => console.log(`  - ${t}`));
      console.log();
      console.log(
        "   These tables may have been created manually or via db:push."
      );
      console.log("   Consider generating a migration to document them.\n");
    } else {
      console.log("✅ All database tables are represented in migrations\n");
    }

    // Check columns for each table (simplified check)
    console.log("📋 Column audit (simplified):");
    let hasColumnIssues = false;

    for (const table of Array.from(migrationTables)) {
      if (actualTables.includes(table)) {
        try {
          const [columns] = await connection.query(
            `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?`,
            [table]
          );
          const actualColumns = new Set(columns.map(c => c.column_name));
          const migrationCols = migrationColumns.get(table) || new Set();

          // Note: This is a simplified check - migrations may add columns incrementally
          if (
            migrationCols.size > 0 &&
            actualColumns.size > migrationCols.size
          ) {
            const missing = Array.from(actualColumns).filter(
              c => !migrationCols.has(c)
            );
            if (missing.length > 0) {
              console.log(
                `  ⚠️  ${table}: ${missing.length} column(s) not in migrations: ${missing.join(", ")}`
              );
              hasColumnIssues = true;
            }
          }
        } catch (_error) {
          // Table might not exist, skip
        }
      }
    }

    if (!hasColumnIssues) {
      console.log("  ✅ No obvious column mismatches detected");
    }
    console.log();

    // Summary
    console.log("=".repeat(60));
    console.log("📊 AUDIT SUMMARY");
    console.log("=".repeat(60));
    console.log(`  Migration files: ${migrationFiles.length}`);
    console.log(`  Tables in migrations: ${migrationTables.size}`);
    console.log(`  Tables in database: ${actualTables.length}`);
    console.log(`  Tables not in migrations: ${tablesNotInMigrations.length}`);
    console.log();

    if (tablesNotInMigrations.length === 0 && !hasColumnIssues) {
      console.log("✅ Migrations appear to be in sync with database schema");
    } else {
      console.log("⚠️  Some discrepancies found - see details above");
    }
    console.log();
  } catch (_error) {
    console.error("❌ Audit failed:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

auditMigrations().catch(error => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
