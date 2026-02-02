/**
 * Session management for PR 2
 * Simple session token system using secure cookies
 */

import crypto from "crypto";
import type { Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";

// Security: Default is for development only. Production will fail startup if not set (see env.ts validateEnv)
const SESSION_SECRET =
  ENV.SESSION_SECRET || process.env.SESSION_SECRET || "change-me-in-production";

/**
 * Create a session token for a user ID
 */
export function createSessionToken(userId: number): string {
  const payload = `${userId}:${Date.now()}`;
  const hmac = crypto.createHmac("sha256", SESSION_SECRET);
  hmac.update(payload);
  const signature = hmac.digest("hex");
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

/**
 * Verify and extract user ID from session token
 */
export function verifySessionToken(token: string): number | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    // Expected format (before base64url): "<userId>:<timestamp>:<signature>"
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;

    const [userIdStr, timestampStr, signature] = parts;
    if (!userIdStr || !timestampStr || !signature) return null;

    const payload = `${userIdStr}:${timestampStr}`;

    // Verify signature
    const hmac = crypto.createHmac("sha256", SESSION_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      return null; // Invalid signature
    }

    // Check if token is expired (disabled for persistent sessions)
    const tokenAge = Date.now() - parseInt(timestampStr, 10);
    if (!Number.isFinite(tokenAge)) {
      return null; // Invalid timestamp
    }

    const userId = parseInt(userIdStr, 10);
    return Number.isFinite(userId) ? userId : null;
  } catch {
    return null;
  }
}

/**
 * Set session cookie
 */
export function setSessionCookie(
  req: Request,
  res: Response,
  userId: number
): void {
  const token = createSessionToken(userId);
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
  });
}

/**
 * Get user ID from session cookie
 */
export function getSessionToken(req: Request): string | null {
  // Prefer cookie-parser if present
  const anyReq = req as Request & { cookies?: Record<string, string> };
  const tokenFromParser = anyReq?.cookies?.[COOKIE_NAME];
  if (typeof tokenFromParser === "string" && tokenFromParser.length > 0)
    return tokenFromParser;

  const cookiesHeader = req.headers.cookie || "";
  const cookieMatch = cookiesHeader.match(
    new RegExp(`(^|; )${COOKIE_NAME}=([^;]+)`)
  );
  if (!cookieMatch) return null;
  return cookieMatch[2] || null;
}

export function getUserIdFromSession(req: Request): number | null {
  const token = getSessionToken(req);
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(req: Request, res: Response): void {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
}
