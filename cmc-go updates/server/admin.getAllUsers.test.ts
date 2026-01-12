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

describe("admin.getAllUsers", () => {
  it("allows admin to retrieve all users", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getAllUsers();

    expect(Array.isArray(result)).toBe(true);
  });

  it("denies access to non-admin users", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getAllUsers()).rejects.toThrow("Admin access required");
  });

  it("returns user objects with correct structure", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getAllUsers();

    if (result.length > 0) {
      const user = result[0];
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("openId");
      expect(user).toHaveProperty("role");
      expect(user).toHaveProperty("createdAt");
    }
  });
});
