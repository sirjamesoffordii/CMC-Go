/**
 * Session management
 * Uses express-session with database-backed storage for persistent sessions
 * Falls back to legacy HMAC token approach for backward compatibility
 */

import crypto from "crypto";
import type { Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";

// Security: Default is for development only. Production will fail startup if not set (see env.ts validateEnv)
const SESSION_SECRET =
  ENV.SESSION_SECRET || process.env.SESSION_SECRET || "change-me-in-production";

// Extend express-session type to include userId
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

/**
 * Set user session using express-session
 * This is the preferred method and uses database-backed sessions
 */
export function setUserSession(req: Request, userId: number): void {
  if (req.session) {
    req.session.userId = userId;
  }
}

/**
 * Get user ID from express-session
 * Returns null if session doesn't exist or userId is not set
 */
export function getUserIdFromExpressSession(req: Request): number | null {
  const userId = req.session?.userId;
  return typeof userId === "number" ? userId : null;
}

/**
 * Clear express-session
 */
export function clearUserSession(req: Request, res: Response): void {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("[Session] Error destroying session:", err);
      }
    });
  }
  // Also clear the legacy cookie for backward compatibility
  clearSessionCookie(req, res);
}

// ============================================================================
// Legacy HMAC token-based session management (backward compatibility)
// ============================================================================

/**
 * Create a session token for a user ID
 * @deprecated Use express-session instead (setUserSession)
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
 * @deprecated Use express-session instead (getUserIdFromExpressSession)
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

    // Check if token is expired (7 day expiry)
    const tokenAge = Date.now() - parseInt(timestampStr, 10);
    if (!Number.isFinite(tokenAge)) {
      return null; // Invalid timestamp
    }

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    if (tokenAge > SEVEN_DAYS_MS) {
      return null; // Token expired
    }

    const userId = parseInt(userIdStr, 10);
    return Number.isFinite(userId) ? userId : null;
  } catch {
    return null;
  }
}

/**
 * Set session cookie (legacy)
 * @deprecated Use express-session instead (setUserSession)
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
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

/**
 * Get user ID from session cookie (legacy)
 * @deprecated Use express-session instead (getUserIdFromExpressSession)
 */
export function getSessionToken(req: Request): string | null {
  // Prefer cookie-parser if present
  const anyReq = req as any;
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

/**
 * Get user ID from session (tries both express-session and legacy cookie)
 * This provides backward compatibility during migration
 */
export function getUserIdFromSession(req: Request): number | null {
  // Try express-session first (preferred)
  const sessionUserId = getUserIdFromExpressSession(req);
  if (sessionUserId !== null) {
    return sessionUserId;
  }

  // Fall back to legacy HMAC token approach
  const token = getSessionToken(req);
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Clear session cookie (legacy)
 */
export function clearSessionCookie(req: Request, res: Response): void {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
}

