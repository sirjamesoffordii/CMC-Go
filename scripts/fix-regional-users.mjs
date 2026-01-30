/**
 * Fix regional users who have overseeRegionId but null regionId
 * This is a one-time fix for users who registered before the registration fix
 */
import mysql from "mysql2/promise";
import { config } from "dotenv";

config();

async function fixRegionalUsers() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const conn = await mysql.createConnection(connectionString);

  try {
    // Find users with REGION_DIRECTOR or REGIONAL_STAFF role who have overseeRegionId but null regionId
    const [rows] = await conn.execute(
      `SELECT id, email, role, regionId, overseeRegionId FROM users WHERE role IN ('REGION_DIRECTOR', 'REGIONAL_STAFF') AND overseeRegionId IS NOT NULL`
    );

    console.log("Found regional users:", rows);

    // Update their regionId to match overseeRegionId
    for (const user of rows) {
      if (!user.regionId && user.overseeRegionId) {
        await conn.execute("UPDATE users SET regionId = ? WHERE id = ?", [
          user.overseeRegionId,
          user.id,
        ]);
        console.log(
          "Updated user",
          user.email,
          "regionId to",
          user.overseeRegionId
        );
      } else {
        console.log("User", user.email, "already has regionId:", user.regionId);
      }
    }

    console.log("Done!");
  } finally {
    await conn.end();
  }
}

fixRegionalUsers().catch(console.error);
