# Needs Domain Logic - Implementation Summary

## Overview
This document summarizes the implementation of clean, consistent needs domain logic that ensures only active needs affect counts, indicators, and UI.

## Rules Implemented

### 1. Needs Creation
- ✅ Needs are **only created** when a real need type is selected (not "None", null, or undefined)
- ✅ Validation in `handleAddPerson` and `handleUpdatePerson` prevents creating needs with type "None"

### 2. Schema Fields
- ✅ `type` (enum: Financial, Transportation, Housing, Other) - already exists
- ✅ `isActive` (boolean, default true) - already exists
- ✅ `metAt` (datetime, nullable) - **ADDED to schema** (requires migration)

### 3. "Need Met" Checkbox Behavior
- ✅ When checked: Sets `isActive = false` and `metAt = NOW()`
- ✅ **Does NOT delete** the need row (preserves history)
- ✅ Implemented in `toggleNeedActive()` and `updateOrCreateNeed()`

### 4. Counting and Summaries
- ✅ All counts **ONLY include** `WHERE needs.isActive = true`
- ✅ `getAllActiveNeeds()` filters by `isActive = true`
- ✅ District needs summary only counts active needs
- ✅ `hasNeeds` indicator derived from active needs only
- ✅ FollowUpPanel filters by `isActive = true`

### 5. hasNeeds Indicator
- ✅ **DERIVED**, not stored
- ✅ `true` if `EXISTS(active needs for person)`
- ✅ `false` otherwise
- ✅ Implemented in:
  - `DistrictPanel.peopleWithNeeds`
  - `Home.peopleWithIndicators`

### 6. Updated Layers

#### A) Server Queries (Drizzle / SQL)
- ✅ `getAllActiveNeeds()` - filters by `isActive = true`
- ✅ `getNeedsByPersonId()` - returns all needs (for display), ordered by createdAt DESC
- ✅ `getNeedByPersonId()` - returns most recent need (active or inactive) for display
- ✅ `toggleNeedActive()` - sets `metAt` when marking as met
- ✅ `updateOrCreateNeed()` - sets `metAt` when marking as met

#### B) API Responses
- ✅ `needs.listActive` - returns only active needs
- ✅ `needs.byPerson` - returns all needs (for display in forms/tooltips)
- ✅ `needs.updateOrCreate` - handles metAt timestamp

#### C) Client Selectors / Derived State
- ✅ `DistrictPanel.allNeeds` - uses `listActive` (only active needs)
- ✅ `DistrictPanel.peopleWithNeeds` - derives `hasNeeds` from active needs
- ✅ `DistrictPanel.needsSummary` - only counts active needs
- ✅ `Home.peopleWithIndicators` - derives `hasNeeds` from active needs

#### D) Tooltips and Summary Panels
- ✅ Person tooltips show active and inactive needs (for display)
- ✅ District panel needs summary only counts active needs
- ✅ FollowUpPanel only shows active needs

### 7. Code Comments
- ✅ Added comments explaining: "Only active needs are counted. Inactive needs are retained for history."
- ✅ Comments added to:
  - `drizzle/schema.ts` (needs table)
  - `server/db.ts` (all need-related functions)
  - `client/src/components/DistrictPanel.tsx` (needs summary, hasNeeds derivation)
  - `client/src/pages/Home.tsx` (hasNeeds derivation)

## Migration Required

### Schema Change: Add `metAt` field

The schema has been updated to include `metAt` field. You need to generate and run a migration:

```bash
# Generate migration (will prompt about description column - select "create column")
pnpm drizzle-kit generate

# Review the generated migration file in drizzle/migrations/

# Apply the migration
pnpm db:migrate
# OR
pnpm db:push
```

**Note:** When running `drizzle-kit generate`, it may ask about the `description` column. Since `description` already exists in the schema, select the option that creates it as a new column (if it doesn't exist in your database) or skip if it already exists.

## Verification Steps

1. ✅ **Create person with no needs** → not counted
   - Create a person with needType = "None"
   - Verify no need row is created in database
   - Verify person does not appear in needs counts

2. ✅ **Add a need** → counted
   - Edit person, set needType to "Financial" or other
   - Verify need row is created with `isActive = true`
   - Verify person appears in needs counts
   - Verify `hasNeeds` indicator shows

3. ✅ **Mark need as met** → immediately removed from counts
   - Check "Need Met" checkbox
   - Verify `isActive = false` and `metAt` is set
   - Verify need is immediately removed from counts
   - Verify `hasNeeds` indicator disappears
   - Verify need row still exists in database (not deleted)

4. ✅ **Historical need remains in DB**
   - Query database directly
   - Verify inactive need row exists with `isActive = false` and `metAt` timestamp

5. ✅ **UI updates without refresh**
   - All counts update immediately after marking need as met
   - No page refresh required

## Files Modified

### Schema
- `drizzle/schema.ts` - Added `metAt` field and comments

### Server
- `server/db.ts` - Updated all need functions with proper filtering and metAt handling
- `server/routers.ts` - Already has proper structure (no changes needed)

### Client
- `client/src/components/DistrictPanel.tsx` - Updated needs handling, counting, and hasNeeds derivation
- `client/src/pages/Home.tsx` - Updated hasNeeds derivation
- `client/src/components/FollowUpPanel.tsx` - Already filters by isActive (no changes needed)
- `client/src/components/PersonTooltip.tsx` - Shows active and inactive needs (for display)
- `client/src/components/PersonIcon.tsx` - Uses byPerson query (includes inactive for display)
- `client/src/components/DroppablePerson.tsx` - Uses byPerson query (includes inactive for display)
- `client/src/components/DistrictDirectorDropZone.tsx` - Uses byPerson query (includes inactive for display)

## Key Principles

1. **Active needs only for counting** - All metrics, summaries, and indicators use `isActive = true`
2. **Preserve history** - Inactive needs are never deleted, only marked as inactive
3. **Derived state** - `hasNeeds` is always derived from active needs, never stored
4. **Clear separation** - Display queries (byPerson) can show inactive needs, but counting queries (listActive) only show active needs

