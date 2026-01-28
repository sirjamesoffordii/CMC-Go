# Authorization Patterns Documentation

## Overview

This document describes the authorization patterns used in the CMC Go application to ensure consistent and secure access control across all tRPC procedures.

## Middleware-Based Authorization

### Available Middleware

The application provides three levels of authorization middleware in `server/_core/trpc.ts`:

#### 1. `publicProcedure`

- **Purpose**: Unauthenticated access
- **Use for**: Public data access, registration, login flows
- **Restrictions**: Should NEVER be used for mutations that modify data unless absolutely necessary for public workflows (e.g., registration)

#### 2. `protectedProcedure`

- **Purpose**: Requires authenticated user
- **Use for**: Any endpoint that requires a logged-in user
- **Enforcement**: Throws `UNAUTHORIZED` error if `ctx.user` is null
- **Dev bypass**: Can be bypassed in development mode via `ENV.devBypassAuth`

#### 3. `adminProcedure`

- **Purpose**: Requires ADMIN role
- **Use for**: Administrative operations (settings, system config)
- **Enforcement**: Throws `FORBIDDEN` error if user is not an ADMIN

### Dev Bypass Guardrail

The `ENV.devBypassAuth` flag is only true when `NODE_ENV === 'development'`. This is enforced in `server/_core/env.ts` and cannot be overridden in production, ensuring authorization is always enforced in production environments.

## Scope-Based Authorization

For operations that require role and scope checks beyond simple authentication, use the helper functions from `server/_core/authorization.ts`:

### Scope Functions

#### `getPeopleScope(user)`

Returns the data scope for a user:

- **CAMPUS**: User can access data for their assigned campus
- **DISTRICT**: User can access data for their assigned district
- **REGION**: User can access data for their assigned region
- **ALL**: User can access all data (ADMIN, REGIONAL_DIRECTOR, etc.)

#### `canEditCampus(user, campusId)`

Checks if user can edit a specific campus:

- STAFF/CO_DIRECTOR: Own campus only
- CAMPUS_DIRECTOR: Any campus in their district
- DISTRICT_DIRECTOR: Any campus in their region
- REGION_DIRECTOR/ADMIN: Any campus

#### `canEditDistrict(user, districtId)`

Checks if user can edit a specific district:

- CAMPUS_DIRECTOR: Own district only
- DISTRICT_DIRECTOR: Any district in their region
- REGION_DIRECTOR/ADMIN: Any district

#### `canEditRegion(user, regionId)`

Checks if user can edit a specific region:

- DISTRICT_DIRECTOR: Own region only
- REGION_DIRECTOR/ADMIN: Any region

#### `canEditNational(user)`

Checks if user can edit nationally:

- Only REGION_DIRECTOR and ADMIN

#### `canApproveDistrictDirector(approverUser, targetUser)`

Checks if approver can approve a District Director:

- Approver must be ACTIVE REGION_DIRECTOR in same region

#### `canApproveRegionDirector(approverUser, targetUser)`

Checks if approver can approve a Region Director:

- Approver must be ADMIN

### Example Usage

```typescript
// Example: Mutation with scope-based authorization
updatePerson: protectedProcedure
  .input(z.object({ personId: z.string(), ... }))
  .mutation(async ({ input, ctx }) => {
    const person = await db.getPersonByPersonId(input.personId);
    if (!person) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
    }

    const scope = getPeopleScope(ctx.user);

    // Check if person is in scope
    if (
      scope.level === "CAMPUS" &&
      person.primaryCampusId !== scope.campusId
    ) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
    }
    if (
      scope.level === "DISTRICT" &&
      person.primaryDistrictId !== scope.districtId
    ) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
    }
    if (
      scope.level === "REGION" &&
      person.region !== scope.regionId
    ) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
    }

    // Perform update...
  });
```

## Authorization Checklist for New Endpoints

When adding a new tRPC procedure, follow this checklist:

### Queries (Data Retrieval)

- [ ] Does this query expose sensitive data?
  - Yes → Use `protectedProcedure` or more restrictive middleware
  - No → Can use `publicProcedure` (but consider future sensitivity)

- [ ] Does the data need scope filtering?
  - Yes → Use `getPeopleScope()` to filter results
  - No → Ensure all authenticated users should see all data

### Mutations (Data Modification)

- [ ] **ALWAYS** start with at minimum `protectedProcedure`
- [ ] Never use `publicProcedure` for mutations unless:
  - It's part of unauthenticated registration flow
  - You have documented why it's safe
  - You have rate limiting or other protection

- [ ] Does this mutation modify system-wide settings?
  - Yes → Use `adminProcedure`

- [ ] Does this mutation modify user-scoped data?
  - Yes → Add scope checks using authorization helpers

- [ ] Does this mutation require role-specific authorization?
  - Yes → Add explicit role checks in the mutation body

## Common Patterns

### Pattern 1: Admin-Only Operations

```typescript
settings: router({
  set: adminProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      await db.setSetting(input.key, input.value);
      return { success: true };
    }),
});
```

### Pattern 2: Scope-Based Access

```typescript
people: router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const scope = getPeopleScope(ctx.user);

    if (scope.level === "ALL") {
      return await db.getAllPeople();
    } else if (scope.level === "REGION") {
      return await db.getPeopleByRegion(scope.regionId);
    } else if (scope.level === "DISTRICT") {
      return await db.getPeopleByDistrict(scope.districtId);
    } else if (scope.level === "CAMPUS") {
      return await db.getPeopleByCampus(scope.campusId);
    }
  }),
});
```

### Pattern 3: Role-Specific Approval Logic

```typescript
approvals: router({
  approve: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const targetUser = await db.getUserById(input.userId);
      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Different approval rules based on target role
      if (targetUser.role === "DISTRICT_DIRECTOR") {
        if (!canApproveDistrictDirector(ctx.user, targetUser)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to approve this user",
          });
        }
      } else if (targetUser.role === "REGION_DIRECTOR") {
        if (!canApproveRegionDirector(ctx.user, targetUser)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to approve this user",
          });
        }
      }

      await db.approveUser(input.userId, ctx.user.id);
      return { success: true };
    }),
});
```

### Pattern 4: Public Read, Protected Write

```typescript
households: router({
  list: publicProcedure.query(async () => {
    return await db.getAllHouseholds();
  }),

  create: protectedProcedure
    .input(z.object({ label: z.string().optional(), ... }))
    .mutation(async ({ input }) => {
      const insertId = await db.createHousehold(input);
      return { id: insertId, ...input };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteHousehold(input.id);
      return { success: true };
    }),
});
```

## Testing Authorization

All authorization logic should be tested. Create tests in files named `*.authorization.test.ts` following these patterns:

### Test Structure

```typescript
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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
      // ... other required fields
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("myRouter authorization", () => {
  it("should reject unauthenticated users", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.myRouter.myMutation({ ... })).rejects.toThrow();
  });

  it("should reject unauthorized roles", async () => {
    const ctx = createTestContext("STAFF");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.myRouter.adminMutation({ ... })).rejects.toThrow();
  });

  it("should allow authorized users", async () => {
    const ctx = createTestContext("ADMIN");
    const caller = appRouter.createCaller(ctx);

    // Test passes authorization check
    // (may fail on DB/other dependencies, but that's OK for auth tests)
    await caller.myRouter.adminMutation({ ... });
  });
});
```

## Security Audit Checklist

When auditing endpoints for authorization:

1. **Identify all mutations**

   ```bash
   grep -n "\.mutation" server/routers.ts
   ```

2. **Check each mutation has appropriate middleware**
   - Public mutations should be rare and documented
   - Most mutations should be `protectedProcedure` or `adminProcedure`

3. **Verify scope checks for user-scoped operations**
   - Any mutation affecting user data should check scope
   - Use helper functions from `authorization.ts`

4. **Test authorization logic**
   - Each protected endpoint should have authorization tests
   - Test both authorized and unauthorized access

5. **Document exceptions**
   - If a mutation must be public, document why
   - Add comments explaining the security rationale

## Current Known Public Mutations

The following mutations are intentionally public and have been reviewed:

### auth.start

- **Purpose**: User registration and login
- **Reason**: Required for unauthenticated users to create accounts
- **Protection**: Input validation, email verification flow

### auth.logout

- **Purpose**: Clear session cookie
- **Reason**: Logging out doesn't require authentication
- **Protection**: No sensitive operations

### campuses.createPublic

- **Purpose**: Create campus during registration
- **Reason**: Users may need to create their campus if it doesn't exist during registration
- **Protection**: Checks for existing campus first, returns existing if found
- **TODO**: Consider adding rate limiting

## Migration Guide

If you find a public mutation that should be protected:

1. Change from `publicProcedure` to `protectedProcedure` or `adminProcedure`
2. Update tests to provide authenticated context
3. Check client code for usage and update as needed
4. Add authorization tests
5. Document the change in PR

## Related Files

- `server/_core/trpc.ts` - Middleware definitions
- `server/_core/authorization.ts` - Authorization helper functions
- `server/routers.ts` - All tRPC procedures
- `server/*.authorization.test.ts` - Authorization tests
