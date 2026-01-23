import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(
  role: string = "STAFF",
  regionId: string | null = null
): TrpcContext {
  return {
    user: {
      id: 1,
      fullName: "Test User",
      email: "test@example.com",
      role: role as any,
      campusId: 1,
      districtId: "TEST_DISTRICT",
      regionId,
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

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("approvals authorization", () => {
  describe("approvals.list", () => {
    it("should allow ADMIN to list approvals", async () => {
      const ctx = createTestContext("ADMIN");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.approvals.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should allow REGION_DIRECTOR to list approvals", async () => {
      const ctx = createTestContext("REGION_DIRECTOR", "TEST_REGION");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.approvals.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return empty array for non-approver roles", async () => {
      const ctx = createTestContext("STAFF");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.approvals.list();
      expect(result).toEqual([]);
    });

    it("should reject unauthenticated users", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.approvals.list()).rejects.toThrow();
    });
  });

  describe("approvals.approve", () => {
    it("should reject unauthenticated users", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.approvals.approve({ userId: 999 })).rejects.toThrow();
    });

    it("should reject STAFF users from approving", async () => {
      const ctx = createTestContext("STAFF");
      const caller = appRouter.createCaller(ctx);

      await expect(caller.approvals.approve({ userId: 999 })).rejects.toThrow();
    });

    it("should reject non-existent user approval", async () => {
      const ctx = createTestContext("ADMIN");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.approvals.approve({ userId: 999999 })
      ).rejects.toThrow();
    });
  });

  describe("approvals.reject", () => {
    it("should reject unauthenticated users", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.approvals.reject({ userId: 999 })).rejects.toThrow();
    });

    it("should reject STAFF users from rejecting", async () => {
      const ctx = createTestContext("STAFF");
      const caller = appRouter.createCaller(ctx);

      await expect(caller.approvals.reject({ userId: 999 })).rejects.toThrow();
    });

    it("should reject non-existent user rejection", async () => {
      const ctx = createTestContext("ADMIN");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.approvals.reject({ userId: 999999 })
      ).rejects.toThrow();
    });
  });
});
