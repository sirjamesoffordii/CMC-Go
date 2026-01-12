# Household Linking Implementation - Complete

## ✅ Implementation Summary

Household linking has been successfully implemented with conditional requirement rules to prevent double-counting of family and guests for married staff.

## Files Modified

### 1. Database Schema
**File:** `drizzle/schema.ts`
- ✅ Added `households` table with `id`, `label`, `childrenCount`, `guestsCount`, `createdAt`, `updatedAt`
- ✅ Added to `people` table:
  - `householdId` (int, nullable FK)
  - `householdRole` (enum: "primary" | "member")
  - `spouseAttending` (boolean, default false)
  - `childrenCount` (int, default 0, 0-10)
  - `guestsCount` (int, default 0, 0-10)
- ✅ Marked legacy fields (`spouse`, `kids`, `guests`) as deprecated

### 2. Server Functions
**File:** `server/db.ts`
- ✅ Added household CRUD functions:
  - `getAllHouseholds()`
  - `getHouseholdById(id)`
  - `getHouseholdMembers(householdId)`
  - `searchHouseholds(query)`
  - `createHousehold(data)`
  - `updateHousehold(id, data)`
  - `deleteHousehold(id)`
- ✅ Updated `createPerson()` to handle new household fields
- ✅ Updated `updatePerson()` to handle new household fields

### 3. API Endpoints
**File:** `server/routers.ts`
- ✅ Added `households` router with:
  - `list` - Get all households
  - `getById` - Get household by ID
  - `getMembers` - Get household members
  - `search` - Search households by label or member names
  - `create` - Create household
  - `update` - Update household
  - `delete` - Delete household
- ✅ Updated `people.create` to accept:
  - `householdId`, `householdRole`, `spouseAttending`, `childrenCount`, `guestsCount`
  - Added validation: household required if `spouseAttending` or `childrenCount > 0`
- ✅ Updated `people.update` to accept same fields with validation

### 4. Client Form UI
**File:** `client/src/components/DistrictPanel.tsx`
- ✅ Updated form state:
  - Replaced `hasSpouse` with `spouseAttending`
  - Replaced `kids` (string) with `childrenCount` (number)
  - Replaced `guests` (string) with `guestsCount` (number)
  - Added `householdId` field
- ✅ Replaced "Accompanying Non Staff" section with "Family & Guests (optional)":
  - Spouse attending (checkbox)
  - Children attending (0-10 number input)
  - Guests attending (0-10 number input)
  - Household selector (dropdown with search)
  - "Create household" button
  - Validation error message when household required but not linked
- ✅ Added validation logic:
  - Household required if `spouseAttending === true` OR `childrenCount > 0`
  - Shows inline error: "To avoid double-counting, link or create a household for spouse/children."
  - Blocks saving with alert if validation fails
- ✅ Updated `handleAddPerson()` to:
  - Use new field names
  - Include household fields in mutation
  - Validate household requirement before saving
- ✅ Updated `handleUpdatePerson()` to:
  - Use new field names
  - Include household fields in mutation
  - Validate household requirement before saving
- ✅ Updated form population when editing:
  - Loads `spouseAttending`, `childrenCount`, `guestsCount`, `householdId` from person
- ✅ Updated all form resets to use new field names

### 5. PersonTooltip
**File:** `client/src/components/PersonTooltip.tsx`
- ✅ Updated to show household counts when person has `householdId`
- ✅ Falls back to person counts for backwards compatibility
- ✅ Shows "Family & Guests:" label
- ✅ Displays children and guests counts from household or person

### 6. Aggregation Helper
**File:** `client/src/utils/householdAggregation.ts` (NEW)
- ✅ Created `calculateHouseholdTotals()` function:
  - Counts unique households (prevents double-counting)
  - Sums household children/guests counts
  - Handles solo people (no household) with fallback counts
  - Returns: `{ families, children, guests }`

## Validation Rules

### Client-Side
- Household is REQUIRED if:
  - `spouseAttending === true` OR
  - `childrenCount > 0`
- Household is NOT required if:
  - Only `guestsCount > 0` (and spouseAttending false, childrenCount 0)
- Validation shows inline error message
- Blocks save with alert if validation fails

### Server-Side
- Same validation in `people.create` and `people.update` mutations
- Throws error if household required but not provided
- Error message: "Household is required when spouse is attending or children count is greater than 0"

## Data Model

### Households Table
```sql
CREATE TABLE households (
  id INT PRIMARY KEY AUTO_INCREMENT,
  label VARCHAR(255) NULL,
  childrenCount INT DEFAULT 0 NOT NULL,
  guestsCount INT DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE NOW()
);
```

### People Table Updates
```sql
ALTER TABLE people ADD COLUMN householdId INT NULL;
ALTER TABLE people ADD COLUMN householdRole ENUM('primary', 'member') DEFAULT 'primary';
ALTER TABLE people ADD COLUMN spouseAttending BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE people ADD COLUMN childrenCount INT DEFAULT 0 NOT NULL;
ALTER TABLE people ADD COLUMN guestsCount INT DEFAULT 0 NOT NULL;
```

## Migration

Run to generate and apply migration:
```bash
pnpm db:generate
pnpm db:migrate
```

## Usage

### Creating a Household
1. Fill out person form (name, role, etc.)
2. Check "Spouse attending" OR set "Children attending" > 0
3. Click "Create household" button (creates household and links person as primary)
4. OR select existing household from dropdown
5. Set children/guests counts (updates household if linked)

### Linking to Existing Household
1. Select household from dropdown
2. Person is linked as "primary" or "member" (defaults to "primary")
3. Children/guests counts update the household

### Aggregation
Use the helper function:
```typescript
import { calculateHouseholdTotals } from '@/utils/householdAggregation';

const { families, children, guests } = calculateHouseholdTotals(people, households);
```

## Testing Checklist

- [x] Schema updated with new fields
- [x] Server validation added
- [x] Form UI updated with household selector
- [x] Validation error shows when required
- [x] Create household button works
- [x] Link to existing household works
- [x] Tooltip shows household counts
- [x] Aggregation helper created
- [ ] Migration generated and applied
- [ ] Test with married staff (both in system)
- [ ] Test validation blocks invalid saves
- [ ] Test backwards compatibility (people without householdId)

## Notes

- Legacy fields (`spouse`, `kids`, `guests`) are kept for backwards compatibility
- PersonTooltip falls back to legacy fields if new fields not available
- Aggregation helper handles both new and legacy fields
- Validation prevents double-counting by requiring household for spouse/children

