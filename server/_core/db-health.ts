import { getDb, getPool } from "../db";
import { sql } from "drizzle-orm";

// Result types for SQL queries
interface CountResult {
  count: number;
}

interface DbNameResult {
  db_name: string;
}

/**
 * Helper to extract rows from mysql2 result format
 * mysql2 returns [rows, fields] tuple, but drizzle may wrap it differently
 */
function asRows(result: unknown): unknown[] {
  // If it's already an array of rows
  if (Array.isArray(result) && result.length > 0 && !Array.isArray(result[0])) {
    return result;
  }
  // If it's a tuple [rows, fields]
  if (
    Array.isArray(result) &&
    result.length === 2 &&
    Array.isArray(result[0])
  ) {
    return result[0];
  }
  // If it's an object with rows property
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown[] }).rows)
  ) {
    return (result as { rows: unknown[] }).rows;
  }
  // If it's wrapped in another array
  if (
    Array.isArray(result) &&
    result.length === 1 &&
    Array.isArray(result[0])
  ) {
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
  // PR 2/3 tables (included in schema.ts and used by app flows)
  "households",
  "invite_notes",
  "auth_tokens",
  "status_changes",
  "import_runs",
] as const;

/**
 * Critical columns per table that must exist
 * Column names match exactly with drizzle/schema.ts
 */
const CRITICAL_COLUMNS: Record<string, string[]> = {
  people: [
    "id",
    "personId",
    "name",
    "primaryRole",
    "primaryCampusId",
    "primaryDistrictId",
    "primaryRegion",
    "nationalCategory",
    "status",
    "depositPaid",
    "statusLastUpdated",
    "statusLastUpdatedBy",
    "householdId",
    "householdRole",
    "needs",
    "notes",
    "spouse",
    "kids",
    "guests",
    "spouseAttending",
    "childrenCount",
    "guestsCount",
    "childrenAges",
    "lastEdited",
    "lastEditedBy",
    "createdAt",
  ],
  districts: ["id", "name", "region", "leftNeighbor", "rightNeighbor"],
  campuses: ["id", "name", "districtId"],
  households: [
    "id",
    "label",
    "childrenCount",
    "guestsCount",
    "createdAt",
    "updatedAt",
  ],
  needs: [
    "id",
    "personId",
    "type",
    "description",
    "amount",
    "visibility",
    "createdById",
    "isActive",
    "resolvedAt",
    "createdAt",
  ],
  notes: ["id", "personId", "category", "content", "createdAt", "createdBy"],
  invite_notes: ["id", "personId", "content", "createdByUserId", "createdAt"],
  assignments: [
    "id",
    "personId",
    "assignmentType",
    "roleTitle",
    "campusId",
    "districtId",
    "region",
    "isPrimary",
    "createdAt",
  ],
  settings: ["key", "value", "updatedAt"],
  auth_tokens: ["id", "token", "email", "expiresAt", "consumedAt", "createdAt"],
  status_changes: [
    "id",
    "personId",
    "fromStatus",
    "toStatus",
    "changedByUserId",
    "changedAt",
    "source",
    "note",
    "districtId",
    "regionId",
    "campusId",
  ],
  import_runs: [
    "id",
    "fileName",
    "importedByUserId",
    "importedAt",
    "createdCount",
    "updatedCount",
    "skippedCount",
    "errorCount",
    "summaryJson",
  ],
};

export interface TableInfo {
  exists: boolean;
  columnCount?: number;
  rowCount?: number;
  columns?: string[];
  sampleRow?: Record<string, unknown>;
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
    return rows.length > 0 && (rows[0] as CountResult).count > 0;
  } catch {
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
    const columns = columnRows.map(
      row =>
        (row as Record<string, string>).column_name ||
        (row as Record<string, string>).COLUMN_NAME ||
        ""
    );

    // Get row count - use pool directly for dynamic table names
    const pool = getPool();
    if (!pool) {
      return { exists: true };
    }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as count FROM \`${tableName}\``
    );
    const rowCount =
      Array.isArray(countResult) && countResult.length > 0
        ? (countResult[0] as CountResult).count
        : 0;

    // Get a sample row (if any exist)
    let sampleRow: Record<string, unknown> | undefined;
    if (rowCount > 0) {
      const [sampleResult] = await pool.execute(
        `SELECT * FROM \`${tableName}\` LIMIT 1`
      );
      if (Array.isArray(sampleResult) && sampleResult.length > 0) {
        sampleRow = sampleResult[0] as Record<string, unknown>;
      }
    }

    return {
      exists: true,
      columnCount: columns.length,
      rowCount,
      columns,
      sampleRow,
    };
  } catch {
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
async function verifyCriticalColumns(
  tableName: string,
  requiredColumns: string[]
): Promise<string[]> {
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
    const existingColumns = columnRows.map(
      (row: any) => row.column_name || row.COLUMN_NAME || ""
    );

    for (const col of requiredColumns) {
      if (!existingColumns.includes(col)) {
        missing.push(col);
      }
    }
  } catch {
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
    if (!db) {
      errors.push("Database connection failed: getDb() returned null");
      return {
        connected: false,
        drizzleMigrationsTableExists: false,
        tables: {},
        errors,
        warnings,
      };
    }

    // Try a simple query to verify connection works
    try {
      await db.execute(sql`SELECT 1`);
      connected = true;
    } catch (queryError) {
      const errorMsg =
        queryError instanceof Error ? queryError.message : String(queryError);
      errors.push(
        `Database connection failed: Failed query: SELECT 1\nparams: ${errorMsg}`
      );
      return {
        connected: false,
        drizzleMigrationsTableExists: false,
        tables: {},
        errors,
        warnings,
      };
    }

    // Verify DATABASE() returns a database name (ensures DATABASE_URL includes DB name)
    try {
      const dbResult = await db.execute(sql`SELECT DATABASE() as db_name`);
      const dbRows = asRows(dbResult);
      databaseName =
        dbRows.length > 0 ? (dbRows[0] as DbNameResult).db_name : null;

      if (!databaseName) {
        errors.push(
          "DATABASE_URL must include database name (e.g., mysql://user:pass@host:port/database_name)"
        );
        return {
          connected: true, // Connected but wrong DB
          drizzleMigrationsTableExists: false,
          tables: {},
          errors,
          warnings,
        };
      }
    } catch (dbNameError) {
      // If we can't get database name, log warning but don't fail
      warnings.push(
        `Could not verify database name: ${dbNameError instanceof Error ? dbNameError.message : String(dbNameError)}`
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    errors.push(
      `Database connection failed: ${errorMsg}${errorStack ? `\nStack: ${errorStack}` : ""}`
    );
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
    warnings.push(
      "drizzle_migrations table does not exist. Migrations may not have been run."
    );
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
        const missingColumns = await verifyCriticalColumns(
          tableName,
          requiredColumns
        );
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
 * In production, allows missing tables (for first deploy) but requires connection
 */
export async function startupDbHealthCheck(): Promise<void> {
  console.log("[DB Health] Performing startup database health check...");

  // Add timeout for health check (30 seconds)
  const healthCheckPromise = checkDbHealth();
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () =>
        reject(new Error("Database health check timed out after 30 seconds")),
      30000
    );
  });

  let health;
  try {
    health = await Promise.race([healthCheckPromise, timeoutPromise]);
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    if (error instanceof Error && error.message.includes("timed out")) {
      console.warn("[DB Health] ⚠️  Health check timed out (development).");
      if (!isProduction) {
        console.warn(
          "[DB Health] Continuing without full health check. Database may be slow."
        );
        return; // Skip health check in development if it times out
      }
    }
    throw error;
  }

  const isProduction = process.env.NODE_ENV === "production";

  if (!health.connected) {
    console.error("[DB Health] ❌ CRITICAL: Database connection failed!");
    console.error("[DB Health] Errors:", health.errors);

    // Log more details about connection failure
    if (health.errors.length > 0) {
      const connectionError = health.errors.find(
        e => e.includes("connection") || e.includes("SELECT 1")
      );
      if (connectionError) {
        console.error("[DB Health] Connection error details:", connectionError);
      }
    }

    throw new Error("Database connection failed during startup health check");
  }

  // In production, allow missing tables (they can be created via migrations)
  // But still log warnings for visibility
  if (health.errors.length > 0) {
    const missingTableErrors = health.errors.filter(e =>
      e.includes("does not exist")
    );
    const schemaErrors = health.errors.filter(
      e => !e.includes("does not exist")
    );

    if (
      isProduction &&
      missingTableErrors.length > 0 &&
      schemaErrors.length === 0
    ) {
      // Production: Only missing tables, allow startup (migrations will create them)
      console.warn(
        "[DB Health] ⚠️  Missing tables detected (expected on first deploy):"
      );
      missingTableErrors.forEach(err => console.warn(`  - ${err}`));
      console.warn(
        "[DB Health] 💡 Run migrations to create tables: pnpm db:migrate"
      );
    } else {
      // Development or schema errors: fail startup
      console.error("[DB Health] ❌ CRITICAL: Schema drift detected!");

      // Log first failing table/columns for quick diagnosis
      const firstError = health.errors[0];
      if (firstError) {
        console.error("[DB Health] First failure:", firstError);
      }

      console.error("[DB Health] All errors:", health.errors);
      console.error(
        "[DB Health] 💡 Fix: Run 'pnpm db:push' or 'pnpm db:migrate' to sync schema"
      );

      throw new Error(
        `Schema drift detected: ${firstError || health.errors.join("; ")}. ` +
          `Run 'pnpm db:push' or 'pnpm db:migrate' to fix.`
      );
    }
  }

  if (health.warnings.length > 0) {
    console.warn("[DB Health] ⚠️  Warnings:", health.warnings);
  }

  if (!health.drizzleMigrationsTableExists) {
    console.warn(
      "[DB Health] ⚠️  drizzle_migrations table not found. Migrations may not have been run."
    );
  }

  console.log("[DB Health] ✅ Database health check passed");
  console.log(`[DB Health] Tables checked: ${CRITICAL_TABLES.length}`);
  console.log(
    `[DB Health] Tables with data: ${Object.values(health.tables).filter(t => (t.rowCount || 0) > 0).length}`
  );

  // Log database name for debugging
  try {
    const db = await getDb();
    if (db) {
      const dbResult = await db.execute(sql`SELECT DATABASE() as db_name`);
      const dbRows = asRows(dbResult);
      const dbName =
        dbRows.length > 0 ? (dbRows[0] as DbNameResult).db_name : "unknown";
      console.log(`[DB Health] Database: ${dbName}`);
    }
  } catch {
    // Ignore errors in logging
  }
}
