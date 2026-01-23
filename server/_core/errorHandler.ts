import { Sentry } from "./sentry";

/**
 * PR 6: Structured error handling utilities
 * Ensures no PII is logged and errors are user-friendly
 */

export interface AppError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export class StructuredError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(error: AppError) {
    super(error.message);
    this.name = "StructuredError";
    this.code = error.code;
    this.statusCode = error.statusCode;
    this.details = error.details;
  }
}

/**
 * Sanitize error for logging (removes PII)
 */
export function sanitizeErrorForLogging(error: unknown): string {
  if (error instanceof StructuredError) {
    return `[${error.code}] ${error.message}`;
  }
  if (error instanceof Error) {
    // Remove potential PII from error messages
    let message = error.message;
    // Remove email patterns
    message = message.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      "[EMAIL]"
    );
    // Remove phone patterns
    message = message.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE]");
    // Remove person IDs that might be sensitive
    message = message.replace(
      /personId["\s:=]+([a-zA-Z0-9_-]+)/gi,
      'personId="[ID]"'
    );
    return message;
  }
  return String(error);
}

/**
 * Create user-friendly error response
 */
export function createErrorResponse(error: unknown): {
  error: string;
  code?: string;
} {
  if (error instanceof StructuredError) {
    return {
      error: error.message,
      code: error.code,
    };
  }
  if (error instanceof Error) {
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === "production") {
      return {
        error: "An error occurred. Please try again later.",
        code: "INTERNAL_ERROR",
      };
    }
    return {
      error: error.message,
      code: "ERROR",
    };
  }
  return {
    error: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
  };
}

/**
 * Capture error to Sentry for monitoring
 */
export function captureErrorToSentry(error: unknown): void {
  // Sanitize error before sending to Sentry
  const sanitizedMessage = sanitizeErrorForLogging(error);

  if (error instanceof StructuredError) {
    // Send structured error with context
    Sentry.captureException(error, {
      tags: {
        errorCode: error.code,
        statusCode: error.statusCode.toString(),
      },
      extra: {
        details: error.details,
      },
    });
  } else if (error instanceof Error) {
    // Send regular error
    Sentry.captureException(error);
  } else {
    // Send as message if not an error object
    Sentry.captureMessage(sanitizedMessage, "error");
  }
}
