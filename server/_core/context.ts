import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getUserIdFromSession } from "./session";
import * as db from "../db";

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
    try {
      user = await db.getUserById(userId);
    } catch (error) {
      // DB may be temporarily unreachable (ETIMEDOUT, etc.).
      // Treat as unauthenticated so public procedures still work.
      console.error(
        "[Context] Failed to fetch user from session (DB may be down):",
        (error as Error).message
      );
      user = null;
    }
    if (user) {
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
  } catch (_error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
