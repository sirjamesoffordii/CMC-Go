import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { districts, campuses, people, settings } from "../drizzle/schema.js";
import { config } from "dotenv";

config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

try {
  console.log("Testing districts query...");
  const districtResult = await db.select().from(districts).limit(1);
  console.log("✓ Districts query successful:", districtResult);

  console.log("\nTesting campuses query...");
  const campusResult = await db.select().from(campuses).limit(1);
  console.log("✓ Campuses query successful:", campusResult);

  console.log("\nTesting people query...");
  const peopleResult = await db.select().from(people).limit(1);
  console.log("✓ People query successful:", peopleResult);

  console.log("\nTesting settings query...");
  const settingsResult = await db.select().from(settings).limit(1);
  console.log("✓ Settings query successful:", settingsResult);
} catch (err) {
  console.error("❌ Query failed:", err.message);
  console.error("Stack:", err.stack);
} finally {
  await conn.end();
}
