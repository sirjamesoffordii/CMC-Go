---
applyTo: "server/**/*.ts"
---

# tRPC Router Standards for CMC Go

## Router Structure

- Routers defined in `server/routers.ts`
- Use `publicProcedure` for unauthenticated endpoints
- Use `protectedProcedure` for authenticated endpoints (enforced by `server/_core/authorization.ts`)

## Procedure Definition

```typescript
export const myProcedure = publicProcedure
  .input(
    z.object({
      /* input schema */
    })
  )
  .output(
    z.object({
      /* output schema */
    })
  )
  .query(async ({ input, ctx }) => {
    // implementation
  });
```

## Input Validation

- Always use Zod schemas for input validation
- Reuse shared schemas from `shared/types.ts` when applicable
- Validate IDs, enums, and required fields explicitly

## Authorization

- Scope enforcement happens in `server/_core/authorization.ts`
- Check user permissions before data access
- Never expose data outside user's scope

## Database Access

- Use `db` from `server/db.ts` for queries
- Use transactions for multi-table operations
- Handle errors gracefully with try/catch

## Error Handling

- Throw `TRPCError` for known error conditions
- Use appropriate error codes: `UNAUTHORIZED`, `NOT_FOUND`, `BAD_REQUEST`
- Include helpful error messages for debugging

## Testing

- Tests live alongside routers: `server/*.test.ts`
- Use `vitest` for unit tests
- Mock database calls when appropriate
- Test both success and error paths

## Startup and Health

- Server entry: `server/_core/index.ts`
- dotenv loads before Sentry init
- Startup includes DB health checks
