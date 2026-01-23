# View Access Control Implementation

## Overview

This implementation adds view access control to ensure users can only access views matching their scope.

## Components Added

### 1. AccessDenied Component (`client/src/components/AccessDenied.tsx`)

- Displays an "Access Denied" message when a user tries to access a resource outside their scope
- Provides a button to redirect users to their appropriate home view based on their scope level
- Shows the user's scope level in the error message

### 2. ViewAccessGuard Component (`client/src/components/ViewAccessGuard.tsx`)

- Guard component that can be wrapped around views to enforce access control
- Checks user scope against requested district/region/campus IDs
- Redirects unauthorized users to their appropriate view
- Shows loading state while checking access

### 3. Home Page Updates (`client/src/pages/Home.tsx`)

- Added automatic redirect logic when users try to access views outside their scope
- Checks URL parameters for viewMode, districtId, regionId, and campusId
- Redirects based on user's scope level:
  - Campus users: Redirected to their campus view
  - District users: Redirected to their district view
  - Region users: Redirected to their region view
  - Admin users: Can access any view
- Displays AccessDenied component when error parameter is set in URL

## Tests Added

### Scope Check Tests (`client/src/lib/scopeCheck.test.ts`)

- 26 tests covering:
  - `getPeopleScope()` function with various user roles
  - `isDistrictInScope()` function with different scope levels
  - `isCampusInScope()` function with different scope levels
- All tests passing

## How It Works

### Access Control Flow:

1. **User Navigates to View**: User clicks on a district, region, or campus in the UI
2. **URL Updated**: ViewState updates and URL parameters reflect the selected view
3. **Scope Check**: useEffect hook in Home.tsx checks if the requested view is in the user's scope
4. **Redirect**: If out of scope, user is redirected to their appropriate view
5. **Access Denied**: If the redirect fails or user manually enters a bad URL, AccessDenied component is shown

### Scope Rules:

- **Campus Users** (`STAFF`, `CO_DIRECTOR`, `CAMPUS_DIRECTOR` without districtId):
  - Can ONLY view their assigned campus
  - Redirected if they try to access other campuses, districts, or regions

- **District Users** (`CAMPUS_DIRECTOR` with districtId, `DISTRICT_DIRECTOR` without regionId):
  - Can view their assigned district and all campuses within it
  - Redirected if they try to access other districts or regions

- **Region Users** (`DISTRICT_DIRECTOR` with regionId, `REGION_DIRECTOR`):
  - Can view their assigned region, all districts within it, and all campuses within those districts
  - Redirected if they try to access other regions

- **Admin Users** (`ADMIN`, `REGION_DIRECTOR` role):
  - Can view everything (ALL scope)
  - No redirects

## Acceptance Criteria Met

✅ Campus user accessing region view gets redirected

- Implemented in Home.tsx useEffect hook (lines 227-284)
- Campus users trying to access region view are redirected to their campus view

✅ District user can't access other districts

- Implemented using `isDistrictInScope()` check
- Out-of-scope districts trigger redirect to user's district view

✅ Appropriate error messages for unauthorized access

- AccessDenied component shows clear error message
- Displays user's scope level
- Provides action to return to appropriate view

## Verification

- `pnpm check` passes ✅
- `pnpm test` - 26 new tests pass, existing failures are unrelated (database config) ✅
- TypeScript compilation successful ✅

## Future Enhancements

1. Add toast notifications when users are redirected due to access violations
2. Add analytics/logging for access control violations
3. Consider adding a "Request Access" feature for users who need broader scope
4. Add E2E tests using Playwright to test the full redirect flow
