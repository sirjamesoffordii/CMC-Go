import "dotenv/config";
import crypto from "crypto";
import { promisify } from "util";
import mysql from "mysql2/promise";

const scryptAsync = promisify(crypto.scrypt);
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

const email = process.argv[2] || "sirjamesoffordII@gmail.com";
const password = process.argv[3] || "Admin123!";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const hash = await hashPassword(password);
await conn.execute(
  "UPDATE users SET passwordHash = ?, loginMethod = ? WHERE email = ?",
  [hash, "PASSWORD", email]
);
console.log(`Password set for ${email}!`);
console.log(`You can now login with password: ${password}`);
await conn.end();
