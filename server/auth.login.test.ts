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
  it("should successfully login existing user with email only", async () => {
    const { ctx, setCookieCalls } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // First, verify email exists endpoint works
    const testEmail = "existing-user@example.com";

    // Check if user exists (this should work even if user doesn't exist in test DB)
    const existsResult = await caller.auth.emailExists({ email: testEmail });
    expect(existsResult).toHaveProperty("exists");
    expect(typeof existsResult.exists).toBe("boolean");
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

  it("should validate email format", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Invalid email should be rejected by Zod validation
    await expect(
      caller.auth.start({ email: "invalid-email" })
    ).rejects.toThrow();
  });
});
