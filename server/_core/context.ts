import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getUserIdFromSession } from "./session";
import * as db from "../db";
import * as dbAdditions from "../db-additions";
import { COOKIE_NAME } from "@shared/const";
import crypto from "crypto";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // PR 2: Try new session-based authentication first
  const userId = getUserIdFromSession(opts.req);
  if (userId) {
    user = await db.getUserById(userId);
    if (user) {
      // Update session lastSeenAt on each request
      const token = opts.req.cookies?.[COOKIE_NAME];
      if (token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await dbAdditions.updateSessionLastSeen(tokenHash).catch(() => {
          // Silently fail if session tracking fails - don't break auth
        });
      }

      return {
        req: opts.req,
        res: opts.res,
        user,
      };
    }
  }

  // Fallback to legacy OAuth authentication
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
