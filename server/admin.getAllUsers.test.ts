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

describe("approvals router", () => {
  it("lists pending approvals", async () => {
    const ctx = createAuthedContext();
    const caller = appRouter.createCaller(ctx);

    const approvals = await caller.approvals.list();
    expect(Array.isArray(approvals)).toBe(true);
  });
});
