import { describe, expect, it } from "vitest";
import type { Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import {
  createSessionToken,
  verifySessionToken,
  setSessionCookie,
  getSessionToken,
  getUserIdFromSession,
  clearSessionCookie,
} from "./_core/session";

// Extended request type for tests that need to modify cookies
type TestRequest = Request & { cookies?: Record<string, string> };

// Mock request factory
function createMockRequest(
  overrides: Partial<{
    protocol: string;
    headers: Record<string, string>;
    cookies: Record<string, string>;
    hostname: string;
  }> = {}
): TestRequest {
  return {
    protocol: overrides.protocol ?? "https",
    headers: overrides.headers ?? {},
    cookies: overrides.cookies ?? {},
    hostname: overrides.hostname ?? "example.com",
  } as unknown as TestRequest;
}

// Mock response factory
function createMockResponse(): {
  res: Response;
  setCookies: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }>;
  clearedCookies: Array<{ name: string; options: Record<string, unknown> }>;
} {
  const setCookies: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }> = [];
  const clearedCookies: Array<{
    name: string;
    options: Record<string, unknown>;
  }> = [];

  const res = {
    cookie: (name: string, value: string, options: Record<string, unknown>) => {
      setCookies.push({ name, value, options });
    },
    clearCookie: (name: string, options: Record<string, unknown>) => {
      clearedCookies.push({ name, options });
    },
  } as unknown as Response;

  return { res, setCookies, clearedCookies };
}

describe("session.ts", () => {
  describe("createSessionToken", () => {
    it("creates a base64url-encoded token for a user ID", () => {
      const token = createSessionToken(123);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      // Token should be base64url (no +, /, or = characters)
      expect(token).not.toMatch(/[+/=]/);
    });

    it("creates different tokens for different user IDs", () => {
      const token1 = createSessionToken(1);
      const token2 = createSessionToken(2);

      expect(token1).not.toBe(token2);
    });

    it("creates different tokens for the same user at different times", async () => {
      const token1 = createSessionToken(1);
      // Wait a tiny bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 5));
      const token2 = createSessionToken(1);

      expect(token1).not.toBe(token2);
    });

    it("handles edge case user IDs", () => {
      expect(() => createSessionToken(0)).not.toThrow();
      expect(() => createSessionToken(Number.MAX_SAFE_INTEGER)).not.toThrow();
    });
  });

  describe("verifySessionToken", () => {
    it("verifies a valid token and returns the user ID", () => {
      const userId = 42;
      const token = createSessionToken(userId);

      const result = verifySessionToken(token);

      expect(result).toBe(userId);
    });

    it("returns null for an invalid token", () => {
      expect(verifySessionToken("invalid")).toBe(null);
      expect(verifySessionToken("")).toBe(null);
    });

    it("returns null for a tampered token (modified signature)", () => {
      const token = createSessionToken(1);
      // Decode, modify, re-encode
      const decoded = Buffer.from(token, "base64url").toString("utf-8");
      const parts = decoded.split(":");
      parts[2] = "tampered" + parts[2]!.slice(8); // Modify signature
      const tamperedToken = Buffer.from(parts.join(":")).toString("base64url");

      expect(verifySessionToken(tamperedToken)).toBe(null);
    });

    it("returns null for a tampered token (modified user ID)", () => {
      const token = createSessionToken(1);
      // Decode, modify user ID, re-encode (signature won't match)
      const decoded = Buffer.from(token, "base64url").toString("utf-8");
      const parts = decoded.split(":");
      parts[0] = "999"; // Change user ID
      const tamperedToken = Buffer.from(parts.join(":")).toString("base64url");

      expect(verifySessionToken(tamperedToken)).toBe(null);
    });

    it("returns null for a token with wrong number of parts", () => {
      // Only 2 parts
      const twoPartsToken = Buffer.from("1:12345").toString("base64url");
      expect(verifySessionToken(twoPartsToken)).toBe(null);

      // 4 parts
      const fourPartsToken =
        Buffer.from("1:12345:sig:extra").toString("base64url");
      expect(verifySessionToken(fourPartsToken)).toBe(null);
    });

    it("returns null for non-numeric user ID in token", () => {
      const invalidToken =
        Buffer.from("abc:12345:fakesig").toString("base64url");
      expect(verifySessionToken(invalidToken)).toBe(null);
    });

    it("returns null for non-numeric timestamp in token", () => {
      const invalidToken = Buffer.from("1:not-a-number:fakesig").toString(
        "base64url"
      );
      expect(verifySessionToken(invalidToken)).toBe(null);
    });

    it("returns null for empty parts in token", () => {
      const emptyUserId = Buffer.from(":12345:fakesig").toString("base64url");
      expect(verifySessionToken(emptyUserId)).toBe(null);

      const emptyTimestamp = Buffer.from("1::fakesig").toString("base64url");
      expect(verifySessionToken(emptyTimestamp)).toBe(null);

      const emptySignature = Buffer.from("1:12345:").toString("base64url");
      expect(verifySessionToken(emptySignature)).toBe(null);
    });

    it("handles user ID 0 correctly", () => {
      const token = createSessionToken(0);
      const result = verifySessionToken(token);
      expect(result).toBe(0);
    });

    it("handles large user IDs correctly", () => {
      const largeId = 9999999999;
      const token = createSessionToken(largeId);
      const result = verifySessionToken(token);
      expect(result).toBe(largeId);
    });

    it("returns null for Infinity or NaN user ID", () => {
      // Create a token that would parse to Infinity
      const infinityToken = Buffer.from("Infinity:12345:fakesig").toString(
        "base64url"
      );
      expect(verifySessionToken(infinityToken)).toBe(null);

      // Create a token that would parse to NaN
      const nanToken = Buffer.from("NaN:12345:fakesig").toString("base64url");
      expect(verifySessionToken(nanToken)).toBe(null);
    });
  });

  describe("setSessionCookie", () => {
    it("sets a session cookie with the correct name and options", () => {
      const req = createMockRequest({
        protocol: "https",
        hostname: "example.com",
      });
      const { res, setCookies } = createMockResponse();

      setSessionCookie(req, res, 123);

      expect(setCookies).toHaveLength(1);
      expect(setCookies[0]!.name).toBe(COOKIE_NAME);
      expect(setCookies[0]!.options).toMatchObject({
        httpOnly: true,
        path: "/",
        sameSite: "none",
        secure: true,
        maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
      });
    });

    it("sets a verifiable token in the cookie", () => {
      const req = createMockRequest();
      const { res, setCookies } = createMockResponse();
      const userId = 456;

      setSessionCookie(req, res, userId);

      const token = setCookies[0]!.value;
      expect(verifySessionToken(token)).toBe(userId);
    });

    it("uses lax sameSite for localhost", () => {
      const req = createMockRequest({
        protocol: "http",
        hostname: "localhost",
        headers: {},
      });
      const { res, setCookies } = createMockResponse();

      setSessionCookie(req, res, 1);

      expect(setCookies[0]!.options.sameSite).toBe("lax");
      expect(setCookies[0]!.options.secure).toBe(false);
    });
  });

  describe("getSessionToken", () => {
    it("returns token from cookie-parser cookies object", () => {
      const req = createMockRequest({
        cookies: { [COOKIE_NAME]: "my-token-value" },
      });

      const result = getSessionToken(req);

      expect(result).toBe("my-token-value");
    });

    it("returns token from Cookie header when cookie-parser not present", () => {
      const req = createMockRequest({
        headers: { cookie: `${COOKIE_NAME}=header-token-value` },
      });
      // Ensure cookies object is not set
      (req as any).cookies = undefined;

      const result = getSessionToken(req);

      expect(result).toBe("header-token-value");
    });

    it("returns token from Cookie header with multiple cookies", () => {
      const req = createMockRequest({
        headers: {
          cookie: `other=foo; ${COOKIE_NAME}=target-value; another=bar`,
        },
      });
      (req as any).cookies = undefined;

      const result = getSessionToken(req);

      expect(result).toBe("target-value");
    });

    it("returns null when no session cookie exists", () => {
      const req = createMockRequest({
        headers: { cookie: "other=value" },
      });
      (req as any).cookies = undefined;

      const result = getSessionToken(req);

      expect(result).toBe(null);
    });

    it("returns null when Cookie header is empty", () => {
      const req = createMockRequest({
        headers: {},
      });
      (req as any).cookies = undefined;

      const result = getSessionToken(req);

      expect(result).toBe(null);
    });

    it("prefers cookie-parser value over header parsing", () => {
      const req = createMockRequest({
        cookies: { [COOKIE_NAME]: "from-parser" },
        headers: { cookie: `${COOKIE_NAME}=from-header` },
      });

      const result = getSessionToken(req);

      expect(result).toBe("from-parser");
    });

    it("returns null for empty string cookie value from parser", () => {
      const req = createMockRequest({
        cookies: { [COOKIE_NAME]: "" },
        headers: { cookie: `${COOKIE_NAME}=from-header` },
      });

      // Empty string from parser should fall back to header
      const result = getSessionToken(req);

      expect(result).toBe("from-header");
    });

    it("handles cookie at the start of Cookie header", () => {
      const req = createMockRequest({
        headers: { cookie: `${COOKIE_NAME}=start-value; other=foo` },
      });
      (req as any).cookies = undefined;

      const result = getSessionToken(req);

      expect(result).toBe("start-value");
    });
  });

  describe("getUserIdFromSession", () => {
    it("returns user ID from a valid session", () => {
      const token = createSessionToken(789);
      const req = createMockRequest({
        cookies: { [COOKIE_NAME]: token },
      });

      const result = getUserIdFromSession(req);

      expect(result).toBe(789);
    });

    it("returns null when no session cookie exists", () => {
      const req = createMockRequest();
      (req as any).cookies = undefined;

      const result = getUserIdFromSession(req);

      expect(result).toBe(null);
    });

    it("returns null for invalid session token", () => {
      const req = createMockRequest({
        cookies: { [COOKIE_NAME]: "invalid-token" },
      });

      const result = getUserIdFromSession(req);

      expect(result).toBe(null);
    });

    it("returns null for tampered session token", () => {
      const token = createSessionToken(1);
      const decoded = Buffer.from(token, "base64url").toString("utf-8");
      const parts = decoded.split(":");
      parts[0] = "999"; // Tamper with user ID
      const tamperedToken = Buffer.from(parts.join(":")).toString("base64url");

      const req = createMockRequest({
        cookies: { [COOKIE_NAME]: tamperedToken },
      });

      const result = getUserIdFromSession(req);

      expect(result).toBe(null);
    });
  });

  describe("clearSessionCookie", () => {
    it("clears the session cookie with correct options", () => {
      const req = createMockRequest({
        protocol: "https",
        hostname: "example.com",
      });
      const { res, clearedCookies } = createMockResponse();

      clearSessionCookie(req, res);

      expect(clearedCookies).toHaveLength(1);
      expect(clearedCookies[0]!.name).toBe(COOKIE_NAME);
      expect(clearedCookies[0]!.options).toMatchObject({
        httpOnly: true,
        path: "/",
        sameSite: "none",
        secure: true,
        maxAge: -1,
      });
    });

    it("uses lax sameSite for localhost", () => {
      const req = createMockRequest({
        protocol: "http",
        hostname: "localhost",
        headers: {},
      });
      const { res, clearedCookies } = createMockResponse();

      clearSessionCookie(req, res);

      expect(clearedCookies[0]!.options.sameSite).toBe("lax");
      expect(clearedCookies[0]!.options.secure).toBe(false);
    });

    it("uses secure options for HTTPS via x-forwarded-proto", () => {
      const req = createMockRequest({
        protocol: "http",
        hostname: "example.com",
        headers: { "x-forwarded-proto": "https" },
      });
      const { res, clearedCookies } = createMockResponse();

      clearSessionCookie(req, res);

      expect(clearedCookies[0]!.options.secure).toBe(true);
      expect(clearedCookies[0]!.options.sameSite).toBe("none");
    });
  });

  describe("integration: full session lifecycle", () => {
    it("creates, verifies, and clears a session", () => {
      const userId = 12345;
      const req = createMockRequest({
        protocol: "https",
        hostname: "example.com",
      });
      const { res, setCookies, clearedCookies } = createMockResponse();

      // 1. Set session
      setSessionCookie(req, res, userId);
      expect(setCookies).toHaveLength(1);

      // 2. Verify the token that was set
      const token = setCookies[0]!.value;
      expect(verifySessionToken(token)).toBe(userId);

      // 3. Simulate reading from request with that token
      const reqWithToken = createMockRequest({
        cookies: { [COOKIE_NAME]: token },
      });
      expect(getUserIdFromSession(reqWithToken)).toBe(userId);

      // 4. Clear session
      clearSessionCookie(req, res);
      expect(clearedCookies).toHaveLength(1);
    });
  });
});
