import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-openid",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("user.updateProfile", () => {
  it("allows authenticated user to update their name", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.user.updateProfile({ name: "Updated Name" });

    expect(result).toEqual({ success: true });
  });

  it("rejects empty name", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.user.updateProfile({ name: "" })).rejects.toThrow();
  });

  it("rejects name that is too long", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const longName = "a".repeat(256);
    await expect(caller.user.updateProfile({ name: longName })).rejects.toThrow();
  });

  it("accepts valid name with special characters", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.user.updateProfile({ name: "John O'Brien-Smith" });

    expect(result).toEqual({ success: true });
  });
});
