import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import type { Pool } from "mysql2/promise";
import { checkDbHealth, startupDbHealthCheck } from "./_core/db-health";
import { getDb, getPool } from "./db";

vi.mock("./db", () => {
  return {
    getDb: vi.fn(),
    getPool: vi.fn(),
  };
});

type DbExecute = (query: unknown) => Promise<unknown>;

function createDbMock(executeImpl: DbExecute) {
  return {
    execute: vi.fn(executeImpl),
  };
}

function createSequentialDbMock(responses: unknown[], fallback?: unknown) {
  let callIndex = 0;
  return createDbMock(async () => {
    if (callIndex < responses.length) {
      const response = responses[callIndex];
      callIndex += 1;
      return response;
    }
    return fallback ?? [];
  });
}

function createPoolMock(count: number): Pool {
  return {
    execute: vi.fn(async () => [[{ count }], []]),
  } as unknown as Pool;
}

describe("db-health", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("returns disconnected state when getDb returns null", async () => {
    (getDb as Mock).mockResolvedValue(null);

    const result = await checkDbHealth();

    expect(result.connected).toBe(false);
    expect(result.errors[0]).toContain("getDb() returned null");
  });

  it("returns disconnected state when SELECT 1 fails", async () => {
    const db = createDbMock(async () => {
      throw new Error("query failed");
    });
    (getDb as Mock).mockResolvedValue(db);

    const result = await checkDbHealth();

    expect(result.connected).toBe(false);
    expect(result.errors.join(" ")).toContain("Failed query: SELECT 1");
  });

  it("returns error when database name is missing", async () => {
    const db = createSequentialDbMock([[{ ok: 1 }], [[{ db_name: null }]]]);
    (getDb as Mock).mockResolvedValue(db);

    const result = await checkDbHealth();

    expect(result.connected).toBe(true);
    expect(result.errors[0]).toContain(
      "DATABASE_URL must include database name"
    );
  });

  it("checks critical tables and reports missing columns", async () => {
    const responses: unknown[] = [
      [{ ok: 1 }],
      [[{ db_name: "cmc_go" }]],
      { rows: [{ count: 1 }] },
    ];

    for (let i = 0; i < 11; i += 1) {
      responses.push({ rows: [{ count: 1 }] });
      responses.push([
        [
          /* empty columns */
        ],
      ]);
      responses.push([
        [
          /* empty columns */
        ],
      ]);
    }

    const db = createSequentialDbMock(responses);

    const pool = createPoolMock(0);

    (getDb as Mock).mockResolvedValue(db);
    (getPool as Mock).mockReturnValue(pool);

    const result = await checkDbHealth();

    expect(result.connected).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(Object.keys(result.tables).length).toBeGreaterThan(0);
  });

  it("throws on startup when connection fails", async () => {
    const db = createDbMock(async () => {
      throw new Error("connection failed");
    });
    (getDb as Mock).mockResolvedValue(db);

    await expect(startupDbHealthCheck()).rejects.toThrow(
      "Database connection failed during startup health check"
    );
  });

  it("allows missing tables in production on startup", async () => {
    process.env.NODE_ENV = "production";

    const responses: unknown[] = [
      [{ ok: 1 }],
      [[{ db_name: "cmc_go" }]],
      [[{ count: 0 }]],
    ];

    for (let i = 0; i < 11; i += 1) {
      responses.push([[{ count: 0 }]]);
    }

    const db = createSequentialDbMock(responses);

    (getDb as Mock).mockResolvedValue(db);
    (getPool as Mock).mockReturnValue(null);

    await expect(startupDbHealthCheck()).resolves.toBeUndefined();
  });
});
