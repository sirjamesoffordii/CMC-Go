import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { ENV } from "./env";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Never leak internal errors (SQL queries, stack traces) to clients
    const isTRPCError = error.cause instanceof TRPCError;
    const isProduction = ENV.isProduction;

    // In production, sanitize non-TRPCError messages
    if (isProduction && !isTRPCError) {
      console.error("[tRPC Error]", error);
      return {
        ...shape,
        message: "An unexpected error occurred. Please try again.",
        data: {
          ...shape.data,
          // Remove stack traces in production
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

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "ADMIN") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user as NonNullable<TrpcContext["user"]>,
      },
    });
  })
);
