#!/usr/bin/env node
import "dotenv/config";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

async function checkSchema() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionString);
    console.log("✓ Connected to database\n");

    // Check critical tables (matches db-health.ts exactly)
    const criticalTables = ["districts", "campuses", "people", "needs", "notes", "assignments", "settings"];
    
    console.log("📋 Checking tables...\n");
    
    for (const tableName of criticalTables) {
      const [tables] = await connection.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
        [tableName]
      );
      
      if (tables.length === 0) {
        console.log(`❌ Table '${tableName}' does NOT exist`);
      } else {
        // Get columns
        const [columnsResult] = await connection.query(
          `SELECT column_name, data_type, is_nullable, column_default 
           FROM information_schema.columns 
           WHERE table_schema = DATABASE() AND table_name = ? 
           ORDER BY ordinal_position`,
          [tableName]
        );
        
        const columns = Array.isArray(columnsResult) ? columnsResult : [];
        const columnNames = columns.map(c => (c.column_name || c.COLUMN_NAME || "").toLowerCase());
        const columnNamesDisplay = columns.map(c => c.column_name || c.COLUMN_NAME || "");
        
        console.log(`✅ Table '${tableName}' exists (${columns.length} columns)`);
        console.log(`   Columns: ${columnNamesDisplay.join(", ")}`);
        
        // Check for critical columns based on table
        
        // Check critical columns (matches db-health.ts exactly)
        const criticalColumns = {
          people: ["personid", "name", "status", "depositpaid", "primarydistrictid", "primaryregion", "primarycampusid", "primaryrole", "nationalcategory", "createdat"],
          districts: ["id", "name", "region"],
          campuses: ["id", "name", "districtid"],
          needs: ["id", "personid", "description", "createdat"],
          notes: ["id", "personid", "content", "createdat"],
          assignments: ["id", "personid", "assignmenttype", "roletitle", "isprimary", "createdat"],
          settings: ["key", "value", "updatedat"],
        };
        
        const required = criticalColumns[tableName] || [];
        if (required.length > 0) {
          const missing = required.filter(col => !columnNames.includes(col));
          if (missing.length > 0) {
            console.log(`   ⚠️  Missing columns: ${missing.join(", ")}`);
          } else {
            console.log(`   ✓ All required columns present`);
          }
        }
      }
    }
    
    console.log("\n✅ Schema check completed");
    
  } catch (error) {
    console.error("❌ Error checking schema:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkSchema();

