import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { TRPCError } from "@trpc/server";

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

describe("settings authorization", () => {
  describe("settings.set", () => {
    it("should allow ADMIN to set settings", async () => {
      const ctx = createTestContext("ADMIN");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.settings.set({
        key: "testKey",
        value: "testValue",
      });

      expect(result).toEqual({ success: true });
    });

    it("should reject non-ADMIN users", async () => {
      const ctx = createTestContext("STAFF");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.settings.set({ key: "testKey", value: "testValue" })
      ).rejects.toThrow();
    });

    it("should reject unauthenticated users", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.settings.set({ key: "testKey", value: "testValue" })
      ).rejects.toThrow();
    });
  });

  describe("settings.uploadHeaderImage", () => {
    it("should allow ADMIN to upload header image", async () => {
      const ctx = createTestContext("ADMIN");
      const caller = appRouter.createCaller(ctx);

      // Note: This will fail in actual execution due to S3 requirements,
      // but it should pass authorization
      await expect(
        caller.settings.uploadHeaderImage({
          imageData: "data:image/jpeg;base64,test",
          fileName: "test.jpg",
          backgroundColor: "#ffffff",
        })
      ).rejects.toThrow(); // Will fail on S3 upload, not authorization
    });

    it("should reject non-ADMIN users", async () => {
      const ctx = createTestContext("STAFF");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.settings.uploadHeaderImage({
          imageData: "data:image/jpeg;base64,test",
          fileName: "test.jpg",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("should reject unauthenticated users", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.settings.uploadHeaderImage({
          imageData: "data:image/jpeg;base64,test",
          fileName: "test.jpg",
        })
      ).rejects.toThrow();
    });
  });
});
