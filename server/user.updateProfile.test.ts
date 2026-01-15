import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthedContext(): TrpcContext {
  return {
    user: {
      id: 1,
      fullName: "Test Admin",
      email: "test-admin@example.com",
      role: "ADMIN",
      campusId: 1,
      districtId: null,
      regionId: null,
      approvalStatus: "ACTIVE",
      approvedByUserId: null,
      approvedAt: null,
      createdAt: new Date(),
      lastLoginAt: null,
      openId: null,
      name: null,
      loginMethod: null,
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns null when logged out", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    const me = await caller.auth.me();
    expect(me).toBeNull();
  });

  it("returns current user when logged in", async () => {
    const ctx = createAuthedContext();
    const caller = appRouter.createCaller(ctx);

    const me = await caller.auth.me();
    expect(me).toBeTruthy();
    expect(me?.email).toBe("test-admin@example.com");
    expect(me).toHaveProperty("campusName");
    expect(me).toHaveProperty("districtName");
    expect(me).toHaveProperty("regionName");
  });
});
