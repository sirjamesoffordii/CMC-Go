import mysql from "mysql2/promise";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[wait-mysql] DATABASE_URL is required");
  process.exit(1);
}

const maxSeconds = Number(process.env.MYSQL_WAIT_SECONDS ?? 60);
const deadline = Date.now() + maxSeconds * 1000;

let lastError;
while (Date.now() < deadline) {
  try {
    const connection = await mysql.createConnection(databaseUrl);
    await connection.query("SELECT 1");
    await connection.end();
    console.log("[wait-mysql] MySQL is ready");
    process.exit(0);
  } catch (error) {
    lastError = error;
    await sleep(1500);
  }
}

console.error("[wait-mysql] Timed out waiting for MySQL");
if (lastError instanceof Error) {
  console.error(`[wait-mysql] Last error: ${lastError.message}`);
}
process.exit(1);
