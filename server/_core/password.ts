/**
 * Password hashing utilities using Node.js crypto module (scrypt)
 * This avoids native dependencies like bcrypt while providing secure password hashing
 */

import crypto from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(crypto.scrypt);

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

/**
 * Hash a password using scrypt
 * Returns a string in the format: salt:hash (both hex-encoded)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verify a password against a stored hash
 * @param password - The plaintext password to verify
 * @param storedHash - The stored hash in format salt:hash
 * @returns true if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const storedHashBuffer = Buffer.from(hashHex, "hex");

  const hash = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(hash, storedHashBuffer);
}
