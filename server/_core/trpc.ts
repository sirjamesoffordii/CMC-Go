import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { ENV } from "./env";

// Error codes whose messages are intentionally user-facing and safe to expose.
// INTERNAL_SERVER_ERROR and anything else get sanitized in production.
const CLIENT_SAFE_CODES = new Set([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "TOO_MANY_REQUESTS",
  "PARSE_ERROR",
  "METHOD_NOT_SUPPORTED",
  "UNPROCESSABLE_CONTENT",
  "PAYLOAD_TOO_LARGE",
]);

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const isProduction = ENV.isProduction;

    // In production, pass through intentionally thrown client-safe errors
    // (NOT_FOUND, UNAUTHORIZED, etc.) and sanitize everything else
    // to avoid leaking SQL queries, stack traces, or internal details.
    if (isProduction && !CLIENT_SAFE_CODES.has(error.code)) {
      console.error("[tRPC Error]", error);
      return {
        ...shape,
        message: "An unexpected error occurred. Please try again.",
        data: {
          ...shape.data,
          stack: undefined,
        },
      };
    }

    // Strip stack traces in production even for safe codes
    if (isProduction) {
      return {
        ...shape,
        data: {
          ...shape.data,
          stack: undefined,
        },
      };
    }

    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  // Dev-only bypass: ENV.devBypassAuth is only true when NODE_ENV === 'development'
  // This guardrail is enforced in env.ts and cannot be overridden in production
  if (!ctx.user && !ENV.devBypassAuth) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // Block banned or non-active users from all protected endpoints
  if (ctx.user) {
    if (ctx.user.isBanned) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your account has been suspended",
      });
    }
    if (ctx.user.approvalStatus !== "ACTIVE") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your account is pending approval",
      });
    }
  }

  return next({
    ctx: {
      ...ctx,
      // At this point user is guaranteed to be present (or dev bypass is enabled).
      // Narrow the type for downstream protected procedures.
      user: ctx.user as NonNullable<TrpcContext["user"]>,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    // ctx.user is guaranteed non-null here because protectedProcedure uses requireUser
    // which throws if user is null (unless dev bypass is enabled)
    const user = ctx.user!;

    if (user.role !== "ADMIN" && user.role !== "CMC_GO_ADMIN") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({ ctx });
  })
);
