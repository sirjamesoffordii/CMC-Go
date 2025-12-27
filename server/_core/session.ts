/**
 * Session management for PR 2
 * Simple session token system using secure cookies
 */

import crypto from "crypto";
import type { Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";

const SESSION_SECRET = ENV.SESSION_SECRET || process.env.SESSION_SECRET || "change-me-in-production";

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
    const [payload, signature] = decoded.split(":");
    if (!payload || !signature) return null;
    
    const [userId, timestamp] = payload.split(":");
    if (!userId || !timestamp) return null;
    
    // Verify signature
    const hmac = crypto.createHmac("sha256", SESSION_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    
    if (signature !== expectedSignature) {
      return null; // Invalid signature
    }
    
    // Check if token is expired (30 days)
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (tokenAge > maxAge) {
      return null; // Token expired
    }
    
    return parseInt(userId);
  } catch (error) {
    return null;
  }
}

/**
 * Set session cookie
 */
export function setSessionCookie(req: Request, res: Response, userId: number): void {
  const token = createSessionToken(userId);
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

/**
 * Get user ID from session cookie
 */
export function getUserIdFromSession(req: Request): number | null {
  const cookies = req.headers.cookie || "";
  const cookieMatch = cookies.match(new RegExp(`(^|; )${COOKIE_NAME}=([^;]+)`));
  if (!cookieMatch) return null;
  
  const token = cookieMatch[2];
  return verifySessionToken(token);
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(req: Request, res: Response): void {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
}

