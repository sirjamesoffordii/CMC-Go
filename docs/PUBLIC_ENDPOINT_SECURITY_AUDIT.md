# Public Endpoint Security Audit - Issue #247

**Date:** January 25, 2026  
**Auditor:** Copilot Agent  
**Scope:** All `publicProcedure` endpoints in `server/routers.ts`

## Executive Summary

This audit reviewed all public API endpoints to ensure they do not leak person identity information to unauthenticated users. One **critical security vulnerability** was identified and fixed.

### Critical Finding (FIXED)

- **Endpoint:** `households.getMembers`
- **Vulnerability:** Exposed full person records (names, roles, status) to unauthenticated users
- **Fix:** Changed to `protectedProcedure` with scope-based authorization filtering
- **Impact:** HIGH - Personal identity data was publicly accessible

## Audit Methodology

1. Identified all endpoints using `publicProcedure`
2. Analyzed the data each endpoint returns
3. Verified no person-identifying fields are exposed
4. Confirmed metrics endpoints return only aggregates
5. Created automated tests to verify security properties

## Detailed Findings

### ✅ SAFE - Public Endpoints (No Person Data)

#### metrics.get

- **Returns:** Aggregate counts only (going, maybe, notGoing, notInvited, total)
- **Safe:** ✅ No person identifiers, names, or roles
- **Purpose:** Overall event attendance metrics

#### metrics.district

- **Returns:** Aggregate counts for a specific district
- **Safe:** ✅ No person identifiers, names, or roles
- **Purpose:** District-level attendance metrics

#### metrics.allDistricts

- **Returns:** Array of aggregate counts per district
- **Safe:** ✅ No person identifiers, names, or roles
- **Purpose:** All district metrics for map visualization

#### metrics.region

- **Returns:** Aggregate counts for a specific region
- **Safe:** ✅ No person identifiers, names, or roles
- **Purpose:** Region-level attendance metrics

#### metrics.allRegions

- **Returns:** Array of aggregate counts per region
- **Safe:** ✅ No person identifiers, names, or roles
- **Purpose:** All region metrics

#### districts.getById

- **Returns:** District info (id, name, region, neighbors)
- **Safe:** ✅ No person data
- **Purpose:** District metadata for map display

#### districts.publicList

- **Returns:** Array of all districts
- **Safe:** ✅ No person data
- **Purpose:** District list for registration/selection

#### campuses.byDistrict

- **Returns:** Array of campuses (id, name, districtId)
- **Safe:** ✅ No person data
- **Purpose:** Campus list for registration/selection

#### campuses.createPublic

- **Returns:** Created/existing campus info
- **Safe:** ✅ No person data (mutation for registration flow)
- **Purpose:** Allow campus creation during registration

#### households.list

- **Returns:** Array of households (id, label, childrenCount, guestsCount)
- **Safe:** ✅ No person data
- **Purpose:** Household metadata only
- **Note:** While safe, the purpose of this public endpoint is unclear and should be reviewed

#### households.getById

- **Returns:** Single household (id, label, childrenCount, guestsCount)
- **Safe:** ✅ No person data
- **Purpose:** Household metadata only
- **Note:** While safe, the purpose of this public endpoint is unclear and should be reviewed

#### households.search

- **Returns:** Array of households matching search query
- **Safe:** ✅ Returns only household records, not person data
- **Note:** Internally uses person names for matching, but doesn't expose them in results
- **Implementation:** Searches household labels and member names, returns matching households

#### settings.get

- **Returns:** Setting value for a given key
- **Safe:** ✅ No person data (system configuration values)
- **Purpose:** Client-side configuration

### ❌ CRITICAL - Fixed Security Issue

#### households.getMembers (FIXED)

- **Location:** `server/routers.ts:1936-1940`
- **Previous Implementation:** `publicProcedure`
- **Vulnerability:** Returned full person records via `db.getHouseholdMembers()`
- **Data Exposed:**
  - `name` - Full person name
  - `personId` - Unique person identifier
  - `primaryRole` - Staff role
  - `primaryCampusId`, `primaryDistrictId`, `primaryRegion` - Assignment data
  - `status` - RSVP status (Yes/Maybe/No/Not Invited)
  - `depositPaid` - Payment status
  - `needs`, `notes` - Personal notes and needs
  - All other person table fields

**Fix Applied:**

```typescript
// Before (VULNERABLE):
getMembers: publicProcedure
  .input(z.object({ householdId: z.number() }))
  .query(async ({ input }) => {
    return await db.getHouseholdMembers(input.householdId);
  }),

// After (SECURE):
getMembers: protectedProcedure
  .input(z.object({ householdId: z.number() }))
  .query(async ({ input, ctx }) => {
    // SECURITY FIX (Issue #247): Require authentication
    const scope = getPeopleScope(ctx.user);
    const members = await db.getHouseholdMembers(input.householdId);

    // Filter based on user's authorization scope
    return members.filter(person => {
      if (scope.level === "ALL") return true;
      if (scope.level === "REGION" && person.primaryRegion === scope.regionId) return true;
      if (scope.level === "DISTRICT" && person.primaryDistrictId === scope.districtId) return true;
      if (scope.level === "CAMPUS" && person.primaryCampusId === scope.campusId) return true;
      return false;
    });
  }),
```

**Security Improvements:**

1. ✅ Requires authentication - unauthenticated requests are rejected with error
2. ✅ Implements scope-based filtering - users only see data they're authorized to access
3. ✅ Respects organizational hierarchy (ALL > REGION > DISTRICT > CAMPUS)

## Authentication Flow Endpoints

These endpoints are public by design for the authentication flow:

### auth.me

- **Safe:** ✅ Returns null for unauthenticated users, user data only for authenticated users
- **Purpose:** Get current authenticated user

### auth.emailExists

- **Safe:** ✅ Returns only boolean (email exists or not)
- **Purpose:** Registration flow validation
- **Note:** This could enable email enumeration but is necessary for UX

### auth.start

- **Safe:** ✅ Creates magic link for login/registration
- **Purpose:** Passwordless authentication flow

### auth.verify

- **Safe:** ✅ Verifies auth token
- **Purpose:** Complete magic link authentication

### auth.logout

- **Safe:** ✅ Clears session
- **Purpose:** User logout

## Recommendations

### High Priority

1. ✅ **COMPLETED:** Fix households.getMembers security leak

### Medium Priority

2. **Review Purpose:** Evaluate whether `households.list`, `households.getById`, and `households.search` need to be public endpoints. If they're not used by unauthenticated users, consider requiring authentication.

3. **Monitor Email Enumeration:** The `auth.emailExists` endpoint enables email enumeration attacks. Consider rate limiting and monitoring for abuse.

### Low Priority

4. **Add Response Validation:** Consider adding explicit output schemas to all public endpoints to document and enforce what data is returned.

5. **Regular Security Audits:** Schedule quarterly reviews of all public endpoints as the application evolves.

## Test Coverage

Created comprehensive security audit tests in `server/public-endpoints.audit.test.ts`:

- ✅ Tests that `households.getMembers` rejects unauthenticated users
- ✅ Documents expected behavior for all public endpoints
- ✅ Verifies no person identity fields are exposed in responses

## Conclusion

**Status:** ✅ All critical security issues resolved  
**Action Required:** None - all findings addressed  
**Next Review:** Recommended in 3-6 months or before next major release

The audit identified and fixed one critical security vulnerability where person identity information was being exposed to unauthenticated users. All other public endpoints correctly return only aggregate data or non-sensitive organizational information.
