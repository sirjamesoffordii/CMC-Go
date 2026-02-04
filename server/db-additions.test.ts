/**
 * Unit tests for server/db-additions.ts
 * Tests all exported functions with comprehensive coverage
 */
import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";

// Mock the db module before importing the functions under test
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// Mock the schema module for userSessions
vi.mock("../drizzle/schema", () => ({
  users: {
    id: { name: "id" },
    fullName: { name: "fullName" },
    email: { name: "email" },
    passwordHash: { name: "passwordHash" },
    role: { name: "role" },
    campusId: { name: "campusId" },
    districtId: { name: "districtId" },
    regionId: { name: "regionId" },
    overseeRegionId: { name: "overseeRegionId" },
    personId: { name: "personId" },
    scopeLevel: { name: "scopeLevel" },
    viewLevel: { name: "viewLevel" },
    editLevel: { name: "editLevel" },
    isBanned: { name: "isBanned" },
    approvalStatus: { name: "approvalStatus" },
    approvedByUserId: { name: "approvedByUserId" },
    approvedAt: { name: "approvedAt" },
    createdAt: { name: "createdAt" },
    lastLoginAt: { name: "lastLoginAt" },
    openId: { name: "openId" },
    name: { name: "name" },
    loginMethod: { name: "loginMethod" },
    roleLabel: { name: "roleLabel" },
    roleTitle: { name: "roleTitle" },
    linkedPersonId: { name: "linkedPersonId" },
  },
}));

import {
  updateUserLastLogin,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} from "./db-additions";
import { getDb } from "./db";

// ============================================================================
// Test Utilities
// ============================================================================

interface MockDbResult {
  select: Mock;
  from: Mock;
  where: Mock;
  limit: Mock;
  update: Mock;
  set: Mock;
  insert: Mock;
  values: Mock;
  delete: Mock;
}

function createMockDb(): MockDbResult {
  const mockResult: MockDbResult = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
    insert: vi.fn(),
    values: vi.fn(),
    delete: vi.fn(),
  };

  // Chain methods for select queries - where needs to return { limit }
  mockResult.select.mockReturnValue({ from: mockResult.from });
  mockResult.from.mockReturnValue({ where: mockResult.where });
  mockResult.where.mockImplementation(() => {
    // Return object with limit for select chains, or resolve for update chains
    return {
      limit: mockResult.limit,
      then: (resolve: (value: unknown) => void) => resolve(undefined),
    };
  });
  mockResult.limit.mockResolvedValue([]);

  // Chain methods for update queries
  mockResult.update.mockReturnValue({ set: mockResult.set });
  mockResult.set.mockReturnValue({ where: mockResult.where });

  // Chain methods for insert queries
  mockResult.insert.mockReturnValue({ values: mockResult.values });
  mockResult.values.mockResolvedValue([{ insertId: BigInt(1) }]);

  // Chain methods for delete queries
  mockResult.delete.mockReturnValue({ where: mockResult.where });

  return mockResult;
}

// ============================================================================
// Test Suites
// ============================================================================

describe("db-additions.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-31T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // updateUserLastLogin Tests
  // ==========================================================================
  describe("updateUserLastLogin", () => {
    it("throws error when database is not available", async () => {
      (getDb as Mock).mockResolvedValue(null);

      await expect(updateUserLastLogin(1)).rejects.toThrow(
        "Database not available"
      );
    });

    it("updates lastLoginAt timestamp for user", async () => {
      const mockDb = createMockDb();
      (getDb as Mock).mockResolvedValue(mockDb);

      await updateUserLastLogin(42);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({
        lastLoginAt: expect.any(Date),
      });
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getAllUsers Tests
  // ==========================================================================
  describe("getAllUsers", () => {
    it("returns empty array when database is not available", async () => {
      (getDb as Mock).mockResolvedValue(null);

      const result = await getAllUsers();

      expect(result).toEqual([]);
    });

    it("returns all users from database", async () => {
      const mockDb = createMockDb();
      const mockUsers = [
        {
          id: 1,
          fullName: "Admin User",
          email: "admin@example.com",
          role: "ADMIN",
        },
        {
          id: 2,
          fullName: "Staff User",
          email: "staff@example.com",
          role: "STAFF",
        },
      ];

      // Override from to return users directly (select with columns)
      mockDb.from.mockResolvedValueOnce(mockUsers);

      (getDb as Mock).mockResolvedValue(mockDb);

      const result = await getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // updateUserRole Tests
  // ==========================================================================
  describe("updateUserRole", () => {
    it("throws error when database is not available", async () => {
      (getDb as Mock).mockResolvedValue(null);

      await expect(updateUserRole(1, "ADMIN")).rejects.toThrow(
        "Database not available"
      );
    });

    it("updates user role to ADMIN", async () => {
      const mockDb = createMockDb();
      (getDb as Mock).mockResolvedValue(mockDb);

      await updateUserRole(1, "ADMIN");

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ role: "ADMIN" });
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("updates user role to STAFF", async () => {
      const mockDb = createMockDb();
      (getDb as Mock).mockResolvedValue(mockDb);

      await updateUserRole(5, "STAFF");

      expect(mockDb.set).toHaveBeenCalledWith({ role: "STAFF" });
    });

    it("updates user role to CO_DIRECTOR", async () => {
      const mockDb = createMockDb();
      (getDb as Mock).mockResolvedValue(mockDb);

      await updateUserRole(10, "CO_DIRECTOR");

      expect(mockDb.set).toHaveBeenCalledWith({ role: "CO_DIRECTOR" });
    });

    it("updates user role to CAMPUS_DIRECTOR", async () => {
      const mockDb = createMockDb();
      (getDb as Mock).mockResolvedValue(mockDb);

      await updateUserRole(10, "CAMPUS_DIRECTOR");

      expect(mockDb.set).toHaveBeenCalledWith({ role: "CAMPUS_DIRECTOR" });
    });

    it("updates user role to DISTRICT_DIRECTOR", async () => {
      const mockDb = createMockDb();
      (getDb as Mock).mockResolvedValue(mockDb);

      await updateUserRole(10, "DISTRICT_DIRECTOR");

      expect(mockDb.set).toHaveBeenCalledWith({ role: "DISTRICT_DIRECTOR" });
    });

    it("updates user role to REGION_DIRECTOR", async () => {
      const mockDb = createMockDb();
      (getDb as Mock).mockResolvedValue(mockDb);

      await updateUserRole(10, "REGION_DIRECTOR");

      expect(mockDb.set).toHaveBeenCalledWith({ role: "REGION_DIRECTOR" });
    });
  });

  // ==========================================================================
  // updateUserStatus Tests
  // ==========================================================================
  describe("updateUserStatus", () => {
    it("throws error when database is not available", async () => {
      (getDb as Mock).mockResolvedValue(null);

      await expect(updateUserStatus(1, "ACTIVE")).rejects.toThrow(
        "Database not available"
      );
    });

    it("updates user status to ACTIVE", async () => {
      const mockDb = createMockDb();
      (getDb as Mock).mockResolvedValue(mockDb);

      await updateUserStatus(1, "ACTIVE");

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ approvalStatus: "ACTIVE" });
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("updates user status to PENDING_APPROVAL", async () => {
      const mockDb = createMockDb();
      (getDb as Mock).mockResolvedValue(mockDb);

      await updateUserStatus(2, "PENDING_APPROVAL");

      expect(mockDb.set).toHaveBeenCalledWith({
        approvalStatus: "PENDING_APPROVAL",
      });
    });

    it("updates user status to REJECTED", async () => {
      const mockDb = createMockDb();
      (getDb as Mock).mockResolvedValue(mockDb);

      await updateUserStatus(3, "REJECTED");

      expect(mockDb.set).toHaveBeenCalledWith({ approvalStatus: "REJECTED" });
    });

    it("updates user status to DISABLED", async () => {
      const mockDb = createMockDb();
      (getDb as Mock).mockResolvedValue(mockDb);

      await updateUserStatus(4, "DISABLED");

      expect(mockDb.set).toHaveBeenCalledWith({ approvalStatus: "DISABLED" });
    });
  });

  // ==========================================================================
  // deleteUser Tests
  // ==========================================================================
  describe("deleteUser", () => {
    it("throws error when database is not available", async () => {
      (getDb as Mock).mockResolvedValue(null);

      await expect(deleteUser(1)).rejects.toThrow("Database not available");
    });

    it("deletes user by userId", async () => {
      const mockDb = createMockDb();
      (getDb as Mock).mockResolvedValue(mockDb);

      await deleteUser(42);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("handles deletion of non-existent user gracefully", async () => {
      const mockDb = createMockDb();
      (getDb as Mock).mockResolvedValue(mockDb);

      // Should not throw even if user doesn't exist
      await expect(deleteUser(99999)).resolves.toBeUndefined();
    });
  });
});
