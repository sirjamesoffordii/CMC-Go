import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT id, email, password_hash, role FROM users WHERE email = ?",
  ["sirjamesoffordii@gmail.com"]
);
console.log("User found:", rows);
await conn.end();
