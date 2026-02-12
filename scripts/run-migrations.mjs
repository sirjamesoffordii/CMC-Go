#!/usr/bin/env node
import "dotenv/config";
import mysql from "mysql2/promise";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return { url: process.env.DATABASE_URL, source: "DATABASE_URL" };
  }

  // Railway MySQL commonly exposes a full connection string as MYSQL_URL.
  if (process.env.MYSQL_URL) {
    return { url: process.env.MYSQL_URL, source: "MYSQL_URL" };
  }

  // Some setups expose a public URL separately.
  if (process.env.MYSQL_PUBLIC_URL) {
    return { url: process.env.MYSQL_PUBLIC_URL, source: "MYSQL_PUBLIC_URL" };
  }

  // Fall back to discrete MySQL env vars (common across platforms and Railway).
  const host = process.env.MYSQL_HOST ?? process.env.MYSQLHOST;
  const port = process.env.MYSQL_PORT ?? process.env.MYSQLPORT ?? "3306";
  const user = process.env.MYSQL_USER ?? process.env.MYSQLUSER;
  const password = process.env.MYSQL_PASSWORD ?? process.env.MYSQLPASSWORD;
  const database = process.env.MYSQL_DATABASE ?? process.env.MYSQLDATABASE;

  if (host && user && database) {
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = password ? encodeURIComponent(password) : "";
    const auth = password ? `${encodedUser}:${encodedPassword}` : encodedUser;
    return {
      url: `mysql://${auth}@${host}:${port}/${database}`,
      source: "MYSQL_*",
    };
  }

  return { url: undefined, source: undefined };
}

const resolved = resolveDatabaseUrl();
// Security: Don't log connection strings (they contain credentials)
console.log(
  "🔍 Database connection:",
  resolved.url ? `Set ✓ (${resolved.source})` : "Not set ✗"
);

const connectionString = resolved.url;
if (!connectionString) {
  console.error(
    "❌ Database connection string is required. Set DATABASE_URL or MYSQL_URL (Railway), or MYSQL_HOST/MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE."
  );
  process.exit(1);
}

async function runMigrations() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionString);
    console.log("✓ Connected to MySQL database");

    // Get all migration files, sorted
    const migrationsDir = join(projectRoot, "drizzle", "migrations");
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log(
        "⚠️  No migration files found in drizzle/migrations/ directory"
      );
      console.log("   Run 'pnpm db:generate' first to create migrations");
      return;
    }

    console.log(`\nFound  migration file(s) in drizzle/migrations:`);
    files.forEach(f => console.log(`  - ${f}`));

    // Check if migrations table exists
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'drizzle_migrations'"
    );

    if (tables.length === 0) {
      console.log("\nCreating drizzle_migrations table...");
      await connection.query(`
        CREATE TABLE IF NOT EXISTS drizzle_migrations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          hash TEXT NOT NULL,
          created_at BIGINT
        )
      `);
      console.log("✓ Created drizzle_migrations table");
    }

    // Get applied migrations
    const [applied] = await connection.query(
      "SELECT hash FROM drizzle_migrations ORDER BY created_at"
    );
    const appliedHashes = new Set(applied.map(r => r.hash));

    // Run each migration
    for (const file of files) {
      const filePath = join(migrationsDir, file);
      const content = readFileSync(filePath, "utf-8");
      const hash = file; // Use filename as hash for simplicity

      if (appliedHashes.has(hash)) {
        console.log(`⏭️  Skipping ${file} (already applied)`);
        continue;
      }

      // Check if tables already exist (e.g., from db:push)
      // If they do, just mark migration as applied without running it
      const statements = content
        .split("--> statement-breakpoint")
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith("--"));

      // Extract table names from CREATE TABLE statements
      const tableNames = [];
      for (const statement of statements) {
        const createTableMatch = statement.match(
          /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?/i
        );
        if (createTableMatch) {
          tableNames.push(createTableMatch[1]);
        }
      }

      // Check if any of these tables already exist
      let tablesExist = false;
      if (tableNames.length > 0) {
        const placeholders = tableNames.map(() => "?").join(",");
        const [existingTables] = await connection.query(
          `SELECT table_name FROM information_schema.tables 
           WHERE table_schema = DATABASE() 
           AND table_name IN (${placeholders})`,
          tableNames
        );
        tablesExist = existingTables.length > 0;
      }

      if (tablesExist) {
        console.log(
          `⏭️  Skipping ${file} (tables already exist, likely from db:push)`
        );
        // Mark as applied anyway to keep migration history in sync
        await connection.query(
          "INSERT INTO drizzle_migrations (hash, created_at) VALUES (?, ?)",
          [hash, Date.now()]
        );
        console.log(`✓ Marked ${file} as applied`);
        continue;
      }

      console.log(`\n📄 Running ${file}...`);

      // Split by statement breakpoints and execute each statement
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            // Use IF NOT EXISTS for CREATE TABLE to be safe
            const safeStatement = statement.replace(
              /CREATE TABLE\s+`?(\w+)`?/gi,
              "CREATE TABLE IF NOT EXISTS `$1`"
            );
            await connection.query(safeStatement);
          } catch (error) {
            // If table already exists error, that's okay - continue
            if (
              error.code === "ER_TABLE_EXISTS_ERROR" ||
              error.message.includes("already exists")
            ) {
              console.warn(
                `⚠️  Table already exists, skipping: ${error.message}`
              );
              continue;
            }
            // If column already exists error (for ALTER TABLE ADD COLUMN), that's okay - continue
            if (
              error.code === "ER_DUP_FIELDNAME" ||
              error.message.includes("Duplicate column name") ||
              error.message.includes("already exists")
            ) {
              console.warn(
                `⚠️  Column already exists, skipping: ${error.message}`
              );
              continue;
            }
            console.error(`❌ Error executing statement in ${file}:`);
            console.error(statement.substring(0, 200));
            console.error(`Error: ${error.message}`);
            throw error;
          }
        }
      }

      // Record migration
      await connection.query(
        "INSERT INTO drizzle_migrations (hash, created_at) VALUES (?, ?)",
        [hash, Date.now()]
      );

      console.log(`✓ Applied ${file}`);
    }

    console.log("\n✅ All migrations completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigrations().catch(console.error);
