import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createUser, getUserByEmail } from "./db";

type SetCookieCall = {
  userId: number;
};

function createPublicContext(): {
  ctx: TrpcContext;
  setCookieCalls: SetCookieCall[];
} {
  const setCookieCalls: SetCookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: any) => {
        // Mock cookie setting - extract userId from token
        // In real implementation, this would be handled by session.ts
        // For testing, we just track that cookie was set
        setCookieCalls.push({ userId: 1 }); // Simplified for testing
      },
    } as TrpcContext["res"],
  };

  return { ctx, setCookieCalls };
}

describe("auth.start - login flow", () => {
  it("should validate email format via Zod schema", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Invalid email should be rejected by Zod validation
    await expect(
      caller.auth.start({ email: "invalid-email" })
    ).rejects.toThrow();
  });

  it("should reject login for non-existent user without registration data", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const nonExistentEmail = `test-${Date.now()}@example.com`;

    // Attempting to login without registration data should fail
    await expect(
      caller.auth.start({ email: nonExistentEmail })
    ).rejects.toThrow("Registration data required for new users");
  });
});
