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
    user = await db.getUserById(userId);
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
  } catch {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
