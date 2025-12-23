import { getDb, getPool } from "../db";
import { sql } from "drizzle-orm";

/**
 * Critical tables that must exist for the app to function
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
 */
const CRITICAL_COLUMNS: Record<string, string[]> = {
  people: ["personId", "name", "status", "primaryDistrictId", "primaryRegion"],
  districts: ["id", "name", "region"],
  campuses: ["id", "name", "districtId"],
  needs: ["id", "personId", "description"],
  notes: ["id", "personId", "content"],
  assignments: ["id", "personId", "assignmentType"],
  settings: ["key", "value"],
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
    
    return Array.isArray(result) && result.length > 0 && (result[0] as any).count > 0;
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
    
    const columns = Array.isArray(columnsResult)
      ? columnsResult.map((row: any) => row.column_name)
      : [];

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
    
    const existingColumns = Array.isArray(columnsResult)
      ? columnsResult.map((row: any) => row.column_name)
      : [];

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
  try {
    const db = await getDb();
    if (db) {
      await db.execute(sql`SELECT 1`);
      connected = true;
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
  const drizzleMigrationsTableExists = await drizzleMigrationsTableExists();
  if (!drizzleMigrationsTableExists) {
    warnings.push("drizzle_migrations table does not exist. Migrations may not have been run.");
  }

  // Check each critical table
  for (const tableName of CRITICAL_TABLES) {
    const info = await getTableInfo(tableName);
    tables[tableName] = info;

    if (!info.exists) {
      errors.push(`Critical table '${tableName}' does not exist`);
    } else {
      // Verify critical columns
      const requiredColumns = CRITICAL_COLUMNS[tableName] || [];
      if (requiredColumns.length > 0) {
        const missingColumns = await verifyCriticalColumns(tableName, requiredColumns);
        if (missingColumns.length > 0) {
          errors.push(
            `Table '${tableName}' is missing required columns: ${missingColumns.join(", ")}`
          );
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
    drizzleMigrationsTableExists,
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

  if (health.errors.length > 0) {
    console.error("[DB Health] ❌ CRITICAL: Schema drift detected!");
    console.error("[DB Health] Errors:", health.errors);
    throw new Error(
      `Schema drift detected: ${health.errors.join("; ")}. ` +
      `Run 'pnpm db:push' or 'pnpm db:migrate' to fix.`
    );
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
}

