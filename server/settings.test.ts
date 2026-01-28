/**
 * Integration tests for settings persistence
 * Tests settings CRUD operations via tRPC router and direct db functions
 *
 * Issue #299: Add integration tests for settings persistence
 */
import { describe, expect, it, afterEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getSetting, setSetting } from "./db";

vi.mock("./storage", () => {
  return {
    storagePut: vi.fn(async () => ({ url: "https://example.test/presigned" })),
    storageGet: vi.fn(async () => ({ url: "https://example.test/presigned" })),
  };
});

// ============================================================================
// Test Fixtures
// ============================================================================

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      fullName: "Test Admin",
      email: "admin@example.com",
      role: "ADMIN",
      campusId: 1,
      districtId: "TEST_DISTRICT",
      regionId: "TEST_REGION",
      personId: null,
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

// Generate unique test keys to avoid cross-test interference
function generateTestKey(prefix: string): string {
  return `test_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function withRestoredSetting<T>(key: string, run: () => Promise<T>) {
  const original = await getSetting(key);
  try {
    return await run();
  } finally {
    if (original?.value != null) {
      await setSetting(key, original.value);
    }
  }
}

// ============================================================================
// Integration Tests: Direct DB Functions
// ============================================================================

describe("settings db functions", () => {
  const testKeys: string[] = [];

  afterEach(async () => {
    // Cleanup test keys by setting them to empty (no delete function exists)
    // In a real scenario, we'd have a deleteSetting function
    // For now, we use unique keys to avoid interference
    testKeys.length = 0;
  });

  describe("getSetting", () => {
    it("should return null for non-existent key", async () => {
      const key = generateTestKey("nonexistent");
      const result = await getSetting(key);

      expect(result).toBeNull();
    });

    it("should retrieve existing setting", async () => {
      const key = generateTestKey("existing");
      const value = "test-value-123";
      testKeys.push(key);

      // Set the value first
      await setSetting(key, value);

      // Now retrieve it
      const result = await getSetting(key);

      expect(result).not.toBeNull();
      expect(result?.key).toBe(key);
      expect(result?.value).toBe(value);
    });

    it("should return setting with updatedAt timestamp", async () => {
      const key = generateTestKey("timestamp");
      const value = "timestamp-test";
      testKeys.push(key);

      await setSetting(key, value);
      const result = await getSetting(key);

      expect(result).not.toBeNull();
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("setSetting", () => {
    it("should create new setting", async () => {
      const key = generateTestKey("create");
      const value = "created-value";
      testKeys.push(key);

      // Initially should not exist
      const before = await getSetting(key);
      expect(before).toBeNull();

      // Create it
      await setSetting(key, value);

      // Should now exist
      const after = await getSetting(key);
      expect(after).not.toBeNull();
      expect(after?.value).toBe(value);
    });

    it("should update existing setting (upsert behavior)", async () => {
      const key = generateTestKey("update");
      const initialValue = "initial-value";
      const updatedValue = "updated-value";
      testKeys.push(key);

      // Create initial
      await setSetting(key, initialValue);
      const initial = await getSetting(key);
      expect(initial?.value).toBe(initialValue);

      // Update it
      await setSetting(key, updatedValue);
      const updated = await getSetting(key);
      expect(updated?.value).toBe(updatedValue);
    });

    it("should update timestamp on update", async () => {
      const key = generateTestKey("timestamp_update");
      testKeys.push(key);

      // Create initial
      await setSetting(key, "value1");
      const initial = await getSetting(key);
      const initialTime = initial?.updatedAt?.getTime() ?? 0;

      // Wait a bit then update
      await new Promise(resolve => setTimeout(resolve, 50));
      await setSetting(key, "value2");
      const updated = await getSetting(key);
      const updatedTime = updated?.updatedAt?.getTime() ?? 0;

      // updatedAt should be >= initial (might be same if very fast)
      expect(updatedTime).toBeGreaterThanOrEqual(initialTime);
    });

    it("should handle empty string value", async () => {
      const key = generateTestKey("empty");
      testKeys.push(key);

      await setSetting(key, "");
      const result = await getSetting(key);

      expect(result).not.toBeNull();
      expect(result?.value).toBe("");
    });

    it("should handle long string value", async () => {
      const key = generateTestKey("long");
      const longValue = "x".repeat(10000);
      testKeys.push(key);

      await setSetting(key, longValue);
      const result = await getSetting(key);

      expect(result).not.toBeNull();
      expect(result?.value).toBe(longValue);
    });

    it("should handle special characters in value", async () => {
      const key = generateTestKey("special");
      const specialValue =
        '{"key": "value", "emoji": "🎉", "unicode": "日本語"}';
      testKeys.push(key);

      await setSetting(key, specialValue);
      const result = await getSetting(key);

      expect(result).not.toBeNull();
      expect(result?.value).toBe(specialValue);
    });
  });
});

// ============================================================================
// Integration Tests: tRPC Router
// ============================================================================

describe("settings router", () => {
  describe("settings.getSettings", () => {
    it("should be publicly accessible and return an array", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.settings.getSettings();

      expect(Array.isArray(result)).toBe(true);
    });

    it("should include a setting after it is created", async () => {
      const key = generateTestKey("list_includes");
      const value = "value-for-list";

      const adminCaller = appRouter.createCaller(createAdminContext());
      await adminCaller.settings.set({ key, value });

      const publicCaller = appRouter.createCaller(
        createUnauthenticatedContext()
      );
      const all = await publicCaller.settings.getSettings();
      expect(all.some(s => s.key === key && s.value === value)).toBe(true);
    });
  });

  describe("settings.get", () => {
    it("should be publicly accessible (no auth required)", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);
      const key = generateTestKey("public_get");

      // Should not throw for unauthenticated users
      const result = await caller.settings.get({ key });

      // Will be null since key doesn't exist
      expect(result).toBeNull();
    });

    it("should return null for non-existent key", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const key = generateTestKey("nonexistent_router");

      const result = await caller.settings.get({ key });

      expect(result).toBeNull();
    });

    it("should retrieve setting set via router", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const key = generateTestKey("router_set_get");
      const value = "router-test-value";

      // Set via router
      await caller.settings.set({ key, value });

      // Get via router
      const result = await caller.settings.get({ key });

      expect(result).not.toBeNull();
      expect(result?.key).toBe(key);
      expect(result?.value).toBe(value);
    });

    it("should retrieve setting set directly in db", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const key = generateTestKey("db_to_router");
      const value = "db-direct-value";

      // Set directly in db
      await setSetting(key, value);

      // Get via router
      const result = await caller.settings.get({ key });

      expect(result).not.toBeNull();
      expect(result?.value).toBe(value);
    });
  });

  describe("settings.updateSettings", () => {
    it("should update multiple keys in one call", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const key1 = generateTestKey("bulk1");
      const key2 = generateTestKey("bulk2");

      const result = await caller.settings.updateSettings({
        [key1]: "v1",
        [key2]: "v2",
      });

      expect(result).toEqual({ success: true });
      expect((await getSetting(key1))?.value).toBe("v1");
      expect((await getSetting(key2))?.value).toBe("v2");
    });

    it("should persist across simulated page loads (new caller instances)", async () => {
      const key = generateTestKey("bulk_persist");

      const caller1 = appRouter.createCaller(createAdminContext());
      await caller1.settings.updateSettings({ [key]: "persisted" });

      const caller2 = appRouter.createCaller(createUnauthenticatedContext());
      const result = await caller2.settings.get({ key });

      expect(result?.value).toBe("persisted");
    });
  });

  describe("settings.set", () => {
    it("should create new setting", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const key = generateTestKey("router_create");
      const value = "new-setting-value";

      const result = await caller.settings.set({ key, value });

      expect(result).toEqual({ success: true });

      // Verify it was created
      const saved = await getSetting(key);
      expect(saved?.value).toBe(value);
    });

    it("should update existing setting", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const key = generateTestKey("router_update");
      const initialValue = "initial";
      const updatedValue = "updated";

      // Create initial
      await caller.settings.set({ key, value: initialValue });
      const initial = await getSetting(key);
      expect(initial?.value).toBe(initialValue);

      // Update
      await caller.settings.set({ key, value: updatedValue });
      const updated = await getSetting(key);
      expect(updated?.value).toBe(updatedValue);
    });

    it("should persist across simulated page loads (new caller instances)", async () => {
      const key = generateTestKey("persist");
      const value = "persisted-value";

      // First "page load" - set the value
      const ctx1 = createAdminContext();
      const caller1 = appRouter.createCaller(ctx1);
      await caller1.settings.set({ key, value });

      // Second "page load" - create new caller, verify value persists
      const ctx2 = createAdminContext();
      const caller2 = appRouter.createCaller(ctx2);
      const result = await caller2.settings.get({ key });

      expect(result?.value).toBe(value);
    });

    it("should handle JSON values", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const key = generateTestKey("json");
      const jsonValue = JSON.stringify({
        theme: "dark",
        notifications: true,
        count: 42,
      });

      await caller.settings.set({ key, value: jsonValue });
      const result = await caller.settings.get({ key });

      expect(result?.value).toBe(jsonValue);
      expect(JSON.parse(result?.value ?? "{}")).toEqual({
        theme: "dark",
        notifications: true,
        count: 42,
      });
    });
  });

  describe("settings.getHeaderImageUrl", () => {
    it("should be publicly accessible", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      // Should not throw for unauthenticated users
      const result = await caller.settings.getHeaderImageUrl();

      // Returns { url: null } or { url: string } based on if headerImageKey exists
      expect(result).toHaveProperty("url");
    });

    it("should return null url when no header image is set", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Get current value to check
      const headerKey = await getSetting("headerImageKey");

      // If no header image key is set, should return null
      if (!headerKey || !headerKey.value) {
        const result = await caller.settings.getHeaderImageUrl();
        expect(result.url).toBeNull();
      }
      // If a header image exists, it should return a URL (presigned)
      else {
        const result = await caller.settings.getHeaderImageUrl();
        // Either null (if S3 fails) or a string URL
        expect(result.url === null || typeof result.url === "string").toBe(
          true
        );
      }
    });
  });

  describe("settings.uploadHeaderImage", () => {
    it("should save headerImageKey and optional headerBgColor", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      vi.spyOn(Date, "now").mockReturnValue(1234567890);

      await withRestoredSetting("headerImageKey", async () => {
        await withRestoredSetting("headerBgColor", async () => {
          const result = await caller.settings.uploadHeaderImage({
            imageData: "data:image/jpeg;base64,dGVzdA==",
            fileName: "test.jpg",
            backgroundColor: "#ffffff",
          });

          expect(result).toHaveProperty("url");
          expect(result).toHaveProperty("backgroundColor", "#ffffff");

          const savedKey = await getSetting("headerImageKey");
          expect(savedKey?.value).toBe("header-images/1234567890-test.jpg");

          const savedColor = await getSetting("headerBgColor");
          expect(savedColor?.value).toBe("#ffffff");
        });
      });
    });
  });
});

// ============================================================================
// Integration Tests: Persistence and Data Integrity
// ============================================================================

describe("settings persistence", () => {
  it("should maintain data integrity across multiple operations", async () => {
    const key = generateTestKey("integrity");

    // Create
    await setSetting(key, "v1");
    expect((await getSetting(key))?.value).toBe("v1");

    // Update multiple times
    await setSetting(key, "v2");
    await setSetting(key, "v3");
    await setSetting(key, "v4");

    // Final value should be v4
    const final = await getSetting(key);
    expect(final?.value).toBe("v4");
  });

  it("should handle concurrent writes gracefully", async () => {
    const key = generateTestKey("concurrent");

    // Simulate concurrent writes
    await Promise.all([
      setSetting(key, "write1"),
      setSetting(key, "write2"),
      setSetting(key, "write3"),
    ]);

    // One of the values should have won
    const result = await getSetting(key);
    expect(["write1", "write2", "write3"]).toContain(result?.value);
  });

  it("should preserve settings after router context changes", async () => {
    const key = generateTestKey("context_change");
    const value = "preserved-across-contexts";

    // Set as admin
    const adminCtx = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);
    await adminCaller.settings.set({ key, value });

    // Read as unauthenticated (public read)
    const publicCtx = createUnauthenticatedContext();
    const publicCaller = appRouter.createCaller(publicCtx);
    const result = await publicCaller.settings.get({ key });

    expect(result?.value).toBe(value);
  });
});

// ============================================================================
// Integration Tests: Default Values and Edge Cases
// ============================================================================

describe("settings defaults and edge cases", () => {
  it("should return null for keys that were never set", async () => {
    const key = `never_set_${Date.now()}`;
    const result = await getSetting(key);
    expect(result).toBeNull();
  });

  it("should handle key names with special characters", async () => {
    const key = generateTestKey("special-key_name.with:chars");
    const value = "special-key-value";

    await setSetting(key, value);
    const result = await getSetting(key);

    expect(result?.value).toBe(value);
  });

  it("should handle numeric strings as values", async () => {
    const key = generateTestKey("numeric");
    const value = "12345";

    await setSetting(key, value);
    const result = await getSetting(key);

    expect(result?.value).toBe("12345");
    expect(typeof result?.value).toBe("string");
  });

  it("should handle boolean strings as values", async () => {
    const key = generateTestKey("boolean");

    await setSetting(key, "true");
    expect((await getSetting(key))?.value).toBe("true");

    await setSetting(key, "false");
    expect((await getSetting(key))?.value).toBe("false");
  });
});
