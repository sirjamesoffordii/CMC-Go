#!/usr/bin/env node
import "dotenv/config";
import mysql from "mysql2/promise";

// Production safeguard
if (process.env.APP_ENV === 'production') {
  console.error('❌ Cannot run init-db script in production environment!');
  console.error('Set APP_ENV to something other than "production" to proceed.');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function initDatabase() {
  console.log("Initializing MySQL database schema...");
  
  let connection;
  try {
    connection = await mysql.createConnection(connectionString);
    
    // Note: Schema is managed by drizzle-kit push, so we just verify connection
    console.log("✓ Connected to MySQL database");
    console.log("✓ Database schema will be managed by drizzle-kit push");
    console.log("\nRun 'pnpm db:push' to create/update the database schema.");
    
  } catch (error) {
    console.error("❌ Failed to connect to database:", error.message);
    console.error("\nMake sure:");
    console.error("1. MySQL server is running");
    console.error("2. Database 'cmc_go' exists (or create it with: CREATE DATABASE cmc_go;)");
    console.error("3. User 'cmc_dev' has proper permissions");
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase().catch(console.error);

