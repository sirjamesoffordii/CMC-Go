import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(role: string = "STAFF"): TrpcContext {
  return {
    user: {
      id: 1,
      fullName: "Test User",
      email: "test@example.com",
      role: role as any,
      campusId: 1,
      districtId: "TEST_DISTRICT",
      regionId: "TEST_REGION",
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

describe("households authorization", () => {
  describe("households.create", () => {
    it("should allow authenticated users to create households", async () => {
      const ctx = createTestContext("STAFF");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.households.create({
        label: "Test Household",
        childrenCount: 2,
        guestsCount: 1,
      });

      expect(result).toHaveProperty("id");
      expect(result.label).toBe("Test Household");
    });

    it("should reject unauthenticated users", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.households.create({
          label: "Test Household",
          childrenCount: 2,
          guestsCount: 1,
        })
      ).rejects.toThrow();
    });
  });

  describe("households.update", () => {
    it("should allow authenticated users to update households", async () => {
      const ctx = createTestContext("STAFF");
      const caller = appRouter.createCaller(ctx);

      // First create a household
      const created = await caller.households.create({
        label: "Test Household",
        childrenCount: 2,
        guestsCount: 1,
      });

      // Then update it
      const result = await caller.households.update({
        id: created.id,
        label: "Updated Household",
        childrenCount: 3,
      });

      expect(result).toEqual({ success: true });
    });

    it("should reject unauthenticated users", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.households.update({
          id: 1,
          label: "Updated Household",
        })
      ).rejects.toThrow();
    });
  });

  describe("households.delete", () => {
    it("should allow authenticated users to delete households", async () => {
      const ctx = createTestContext("STAFF");
      const caller = appRouter.createCaller(ctx);

      // First create a household
      const created = await caller.households.create({
        label: "Test Household to Delete",
        childrenCount: 0,
        guestsCount: 0,
      });

      // Then delete it
      const result = await caller.households.delete({ id: created.id });

      expect(result).toEqual({ success: true });
    });

    it("should reject unauthenticated users", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.households.delete({ id: 1 })).rejects.toThrow();
    });
  });
});
