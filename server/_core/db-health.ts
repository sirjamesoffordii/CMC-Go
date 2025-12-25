import { getDb, getPool } from "../db";
import { sql } from "drizzle-orm";

/**
 * Helper to extract rows from mysql2 result format
 * mysql2 returns [rows, fields] tuple, but drizzle may wrap it differently
 */
function asRows(result: any): any[] {
  // If it's already an array of rows
  if (Array.isArray(result) && result.length > 0 && !Array.isArray(result[0])) {
    return result;
  }
  // If it's a tuple [rows, fields]
  if (Array.isArray(result) && result.length === 2 && Array.isArray(result[0])) {
    return result[0];
  }
  // If it's an object with rows property
  if (result && Array.isArray(result.rows)) {
    return result.rows;
  }
  // If it's wrapped in another array
  if (Array.isArray(result) && result.length === 1 && Array.isArray(result[0])) {
    return result[0];
  }
  // Default: try to return as-is if it's an array
  return Array.isArray(result) ? result : [];
}

/**
 * Critical tables that must exist for the app to function
 * Source of truth: drizzle/schema.ts
 * Note: users table exists but is not critical for app startup (auth is optional)
 */
const CRITICAL_TABLES = [
  "districts",
  "campuses", 
  "people",
  "needs",
  "notes",
  "assignments",
  "settings",
] as const;

/**
 * Critical columns per table that must exist
 * Column names match exactly with drizzle/schema.ts
 */
const CRITICAL_COLUMNS: Record<string, string[]> = {
  // people table - matches schema.ts exactly
  people: [
    "personId",        // varchar(64), not null, unique
    "name",            // varchar(255), not null
    "status",          // enum, not null, default "Not Invited"
    "depositPaid",     // boolean, not null, default false
    "primaryDistrictId", // varchar(64), nullable
    "primaryRegion",   // varchar(255), nullable
    "primaryCampusId", // int, nullable
    "primaryRole",     // varchar(255), nullable
    "nationalCategory", // varchar(255), nullable
    "createdAt",       // timestamp, not null, defaultNow
  ],
  // districts table - matches schema.ts exactly
  districts: [
    "id",              // varchar(64), primary key
    "name",            // varchar(255), not null
    "region",          // varchar(255), not null
  ],
  // campuses table - matches schema.ts exactly
  campuses: [
    "id",              // int, primary key, autoincrement
    "name",            // varchar(255), not null
    "districtId",      // varchar(64), not null
  ],
  // needs table - matches schema.ts exactly
  needs: [
    "id",              // int, primary key, autoincrement
    "personId",        // varchar(64), not null
    "description",     // text, not null
    "createdAt",       // timestamp, not null, defaultNow
  ],
  // notes table - matches schema.ts exactly
  notes: [
    "id",              // int, primary key, autoincrement
    "personId",        // varchar(64), not null
    "content",         // text, not null
    "createdAt",       // timestamp, not null, defaultNow
  ],
  // assignments table - matches schema.ts exactly
  assignments: [
    "id",              // int, primary key, autoincrement
    "personId",        // varchar(64), not null
    "assignmentType",  // enum, not null
    "roleTitle",       // varchar(255), not null
    "isPrimary",       // boolean, not null, default false
    "createdAt",       // timestamp, not null, defaultNow
  ],
  // settings table - matches schema.ts exactly
  settings: [
    "key",             // varchar(255), primary key
    "value",           // text, nullable
    "updatedAt",       // timestamp, not null, defaultNow, onUpdateNow
  ],
};

export interface TableInfo {
  exists: boolean;
  columnCount?: number;
  rowCount?: number;
  columns?: string[];
  sampleRow?: Record<string, any>;
}

export interface DbHealthCheckResult {
  connected: boolean;
  drizzleMigrationsTableExists: boolean;
  tables: Record<string, TableInfo>;
  errors: string[];
  warnings: string[];
}

/**
 * Check if a table exists in the database
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = ${tableName}
    `);
    
    const rows = asRows(result);
    return rows.length > 0 && (rows[0] as any).count > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get table information including columns and row count
 */
async function getTableInfo(tableName: string): Promise<TableInfo> {
  const exists = await tableExists(tableName);
  
  if (!exists) {
    return { exists: false };
  }

  try {
    const db = await getDb();
    if (!db) {
      return { exists: true };
    }

    // Get column names
    const columnsResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
      AND table_name = ${tableName}
      ORDER BY ordinal_position
    `);
    
    const columnRows = asRows(columnsResult);
    const columns = columnRows.map((row: any) => row.column_name || row.COLUMN_NAME || "");

    // Get row count - use pool directly for dynamic table names
    const pool = getPool();
    if (!pool) {
      return { exists: true };
    }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as count FROM \`${tableName}\``
    );
    const rowCount = Array.isArray(countResult) && countResult.length > 0
      ? (countResult[0] as any).count
      : 0;

    // Get a sample row (if any exist)
    let sampleRow: Record<string, any> | undefined;
    if (rowCount > 0) {
      const [sampleResult] = await pool.execute(
        `SELECT * FROM \`${tableName}\` LIMIT 1`
      );
      if (Array.isArray(sampleResult) && sampleResult.length > 0) {
        sampleRow = sampleResult[0] as Record<string, any>;
      }
    }

    return {
      exists: true,
      columnCount: columns.length,
      rowCount,
      columns,
      sampleRow,
    };
  } catch (error) {
    return {
      exists: true,
      columnCount: undefined,
      rowCount: undefined,
    };
  }
}

/**
 * Check if drizzle_migrations table exists
 */
async function drizzleMigrationsTableExists(): Promise<boolean> {
  return await tableExists("drizzle_migrations");
}

/**
 * Verify critical columns exist in a table
 */
async function verifyCriticalColumns(tableName: string, requiredColumns: string[]): Promise<string[]> {
  const missing: string[] = [];
  
  try {
    const db = await getDb();
    if (!db) {
      return requiredColumns; // All missing if no DB
    }

    const columnsResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
      AND table_name = ${tableName}
    `);
    
    const columnRows = asRows(columnsResult);
    const existingColumns = columnRows.map((row: any) => row.column_name || row.COLUMN_NAME || "");

    for (const col of requiredColumns) {
      if (!existingColumns.includes(col)) {
        missing.push(col);
      }
    }
  } catch (error) {
    // If we can't check, assume all are missing
    return requiredColumns;
  }

  return missing;
}

/**
 * Perform comprehensive database health check
 */
export async function checkDbHealth(): Promise<DbHealthCheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tables: Record<string, TableInfo> = {};

  // Check connection
  let connected = false;
  let databaseName: string | null = null;
  try {
    const db = await getDb();
    if (db) {
      await db.execute(sql`SELECT 1`);
      connected = true;
      
      // Verify DATABASE() returns a database name (ensures DATABASE_URL includes DB name)
      const dbResult = await db.execute(sql`SELECT DATABASE() as db_name`);
      const dbRows = asRows(dbResult);
      databaseName = dbRows.length > 0 ? (dbRows[0] as any).db_name : null;
      
      if (!databaseName) {
        errors.push("DATABASE_URL must include database name (e.g., mysql://user:pass@host:port/database_name)");
        return {
          connected: true, // Connected but wrong DB
          drizzleMigrationsTableExists: false,
          tables: {},
          errors,
          warnings,
        };
      }
    }
  } catch (error) {
    errors.push(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      connected: false,
      drizzleMigrationsTableExists: false,
      tables: {},
      errors,
      warnings,
    };
  }

  // Check drizzle_migrations table
  const hasDrizzleMigrationsTable = await drizzleMigrationsTableExists();
  if (!hasDrizzleMigrationsTable) {
    warnings.push("drizzle_migrations table does not exist. Migrations may not have been run.");
  }

  // Check each critical table
  for (const tableName of CRITICAL_TABLES) {
    const info = await getTableInfo(tableName);
    tables[tableName] = info;

    if (!info.exists) {
      const errorMsg = `Critical table '${tableName}' does not exist`;
      errors.push(errorMsg);
    } else {
      // Verify critical columns
      const requiredColumns = CRITICAL_COLUMNS[tableName] || [];
      if (requiredColumns.length > 0) {
        const missingColumns = await verifyCriticalColumns(tableName, requiredColumns);
        if (missingColumns.length > 0) {
          const errorMsg = `Table '${tableName}' is missing required columns: ${missingColumns.join(", ")}`;
          errors.push(errorMsg);
        }
      }

      // Warn if table is empty (might be expected for new deployments)
      if (info.rowCount === 0) {
        warnings.push(`Table '${tableName}' exists but is empty`);
      }
    }
  }

  return {
    connected,
    drizzleMigrationsTableExists: hasDrizzleMigrationsTable,
    tables,
    errors,
    warnings,
  };
}

/**
 * Startup health check - throws if critical issues found
 */
export async function startupDbHealthCheck(): Promise<void> {
  console.log("[DB Health] Performing startup database health check...");
  
  const health = await checkDbHealth();

  if (!health.connected) {
    console.error("[DB Health] ❌ CRITICAL: Database connection failed!");
    console.error("[DB Health] Errors:", health.errors);
    throw new Error("Database connection failed during startup health check");
  }

  if (health.errors.length > 0 && process.env.NODE_ENV !== 'production') {
    console.error("[DB Health] ❌ CRITICAL: Schema drift detected!");
    
    // Log first failing table/columns for quick diagnosis
    const firstError = health.errors[0];
    if (firstError) {
      console.error("[DB Health] First failure:", firstError);
    }
    
    console.error("[DB Health] All errors:", health.errors);
    console.error("[DB Health] 💡 Fix: Run 'pnpm db:push' or 'pnpm db:migrate' to sync schema");
    
    throw new Error(
      `Schema drift detected: ${firstError || health.errors.join("; ")}. ` +
      `Run 'pnpm db:push' or 'pnpm db:migrate' to fix.`
    );
  }
   else if (health.errors.length > 0) {
    console.warn("[DB Health] ⚠️ PRODUCTION: Schema errors detected but allowing startup. Run migrations with 'pnpm db:migrate'.");
    console.warn("[DB Health] Errors:", health.errors);
  }

  if (health.warnings.length > 0) {
    console.warn("[DB Health] ⚠️  Warnings:", health.warnings);
  }

  if (!health.drizzleMigrationsTableExists) {
    console.warn("[DB Health] ⚠️  drizzle_migrations table not found. Migrations may not have been run.");
  }

  console.log("[DB Health] ✅ Database health check passed");
  console.log(`[DB Health] Tables checked: ${CRITICAL_TABLES.length}`);
  console.log(`[DB Health] Tables with data: ${Object.values(health.tables).filter(t => (t.rowCount || 0) > 0).length}`);
  
  // Log database name for debugging
  try {
    const db = await getDb();
    if (db) {
      const dbResult = await db.execute(sql`SELECT DATABASE() as db_name`);
      const dbRows = asRows(dbResult);
      const dbName = dbRows.length > 0 ? (dbRows[0] as any).db_name : "unknown";
      console.log(`[DB Health] Database: ${dbName}`);
    }
  } catch {
    // Ignore errors in logging
  }
}

