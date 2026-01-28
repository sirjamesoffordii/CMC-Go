import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  StructuredError,
  sanitizeErrorForLogging,
  createErrorResponse,
  captureErrorToSentry,
} from "./_core/errorHandler";

vi.mock("./_core/sentry", () => {
  return {
    Sentry: {
      captureException: vi.fn(),
      captureMessage: vi.fn(),
    },
  };
});

const getSentryMocks = async () => {
  const { Sentry } = await import("./_core/sentry");
  return {
    captureException: Sentry.captureException as ReturnType<typeof vi.fn>,
    captureMessage: Sentry.captureMessage as ReturnType<typeof vi.fn>,
  };
};

describe("errorHandler", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("sanitizes StructuredError messages", () => {
    const err = new StructuredError({
      code: "E_TEST",
      message: "Safe message",
      statusCode: 400,
      details: { foo: "bar" },
    });

    expect(sanitizeErrorForLogging(err)).toBe("[E_TEST] Safe message");
  });

  it("sanitizes PII from error messages", () => {
    const err = new Error(
      "User john.doe@example.com with phone 555-123-4567 and personId=abc123 failed"
    );

    const sanitized = sanitizeErrorForLogging(err);
    expect(sanitized).toContain("[EMAIL]");
    expect(sanitized).toContain("[PHONE]");
    expect(sanitized).toContain('personId="[ID]"');
  });

  it("creates error response for structured error", () => {
    const err = new StructuredError({
      code: "E_STRUCT",
      message: "Structured message",
      statusCode: 422,
    });

    expect(createErrorResponse(err)).toEqual({
      error: "Structured message",
      code: "E_STRUCT",
    });
  });

  it("creates generic error response in production", () => {
    process.env.NODE_ENV = "production";
    const err = new Error("Sensitive details");

    expect(createErrorResponse(err)).toEqual({
      error: "An error occurred. Please try again later.",
      code: "INTERNAL_ERROR",
    });
  });

  it("captures errors to Sentry with structured context", async () => {
    const { captureException } = await getSentryMocks();
    const err = new StructuredError({
      code: "E_CAPTURE",
      message: "Capture me",
      statusCode: 500,
      details: { reason: "boom" },
    });

    captureErrorToSentry(err);

    expect(captureException).toHaveBeenCalledWith(err, {
      tags: {
        errorCode: "E_CAPTURE",
        statusCode: "500",
      },
      extra: {
        details: { reason: "boom" },
      },
    });
  });

  it("captures non-error inputs as messages", async () => {
    const { captureMessage } = await getSentryMocks();

    captureErrorToSentry("string error");

    expect(captureMessage).toHaveBeenCalledWith("string error", "error");
  });
});
