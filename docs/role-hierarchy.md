# Role Hierarchy and Permissions

## Overview

CMC Go implements a hierarchical role-based access control system with four primary leadership levels and two staff levels.

## Role Definitions

### Leadership Roles (in ascending order)

1. **Campus Director** (`CAMPUS_DIRECTOR`)
   - Manages a specific campus
   - Can edit entire district (including other campuses in the same district)
   - Hierarchy level: 2

2. **District Director** (`DISTRICT_DIRECTOR`)
   - Manages a district containing multiple campuses
   - Can edit entire region when ACTIVE
   - Hierarchy level: 3

3. **Region Director** (`REGION_DIRECTOR`)
   - Manages a region containing multiple districts
   - Can edit nationally when ACTIVE
   - Hierarchy level: 4

4. **Admin/National** (`ADMIN`)
   - Full system access
   - Can edit all data nationally
   - Can manage all users and roles
   - Hierarchy level: 5

### Staff Roles

1. **Co-Director** (`CO_DIRECTOR`)
   - Campus-level staff with leadership privileges
   - Can only edit their own campus
   - Hierarchy level: 1

2. **Staff** (`STAFF`)
   - Campus-level staff
   - Can only edit their own campus
   - Hierarchy level: 0

## Role Hierarchy

```
ADMIN (5)                    ← National/Admin
    ↓
REGION_DIRECTOR (4)          ← Region Director
    ↓
DISTRICT_DIRECTOR (3)        ← District Director
    ↓
CAMPUS_DIRECTOR (2)          ← Campus Director
    ↓
CO_DIRECTOR (1)              ← Co-Director
    ↓
STAFF (0)                    ← Staff
```

## Helper Functions

The system provides several helper functions for role checking and hierarchy management:

### Role Checkers

- `isAdmin(role)` - Returns true if role is ADMIN
- `isRegionDirector(role)` - Returns true if role is REGION_DIRECTOR
- `isDistrictDirector(role)` - Returns true if role is DISTRICT_DIRECTOR
- `isCampusDirector(role)` - Returns true if role is CAMPUS_DIRECTOR
- `isLeaderRole(role)` - Returns true if role is CO_DIRECTOR or higher

### Hierarchy Helpers

- `isAtLeast(role, minRole)` - Returns true if role is at or above minRole in hierarchy
  - Example: `isAtLeast("ADMIN", "DISTRICT_DIRECTOR")` → `true`
  - Example: `isAtLeast("CAMPUS_DIRECTOR", "REGION_DIRECTOR")` → `false`

- `canManage(managerRole, targetRole)` - Returns true if managerRole can manage targetRole
  - Example: `canManage("ADMIN", "REGION_DIRECTOR")` → `true`
  - Example: `canManage("DISTRICT_DIRECTOR", "CAMPUS_DIRECTOR")` → `true`
  - Example: `canManage("STAFF", "STAFF")` → `false` (same level)

## Permission Scopes

### Editing Permissions

- **STAFF, CO_DIRECTOR**: Can edit ONLY their campus
- **CAMPUS_DIRECTOR**: Can edit entire district (all campuses in their district)
- **DISTRICT_DIRECTOR (ACTIVE)**: Can edit entire region
- **REGION_DIRECTOR (ACTIVE)**: Can edit nationally
- **ADMIN**: Can edit nationally

### Viewing Permissions

- **All authenticated users**: Can view data within their scope
- **Leaders (CO_DIRECTOR+)**: Can view invite notes within their editing scope
- **DISTRICT_DIRECTOR+**: Can view needs based on visibility settings

## Approval Workflow

- **Campus Directors**: Approved by District Directors in same district
- **District Directors**: Approved by Region Directors in same region
- **Region Directors**: Approved by ADMIN
- Users must have `approvalStatus = "ACTIVE"` to exercise their full permissions

## Implementation Details

Role definitions and hierarchy helpers are implemented in:

- Schema: `drizzle/schema.ts` (users table, lines 21-28)
- Authorization: `server/_core/authorization.ts`

## Notes

- The role hierarchy is fixed and should not be modified without careful consideration
- All role comparisons use the numeric hierarchy levels defined in `ROLE_HIERARCHY`
- Active status (`approvalStatus = "ACTIVE"`) is required for most permissions
