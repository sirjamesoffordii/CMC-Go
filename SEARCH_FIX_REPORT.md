# Search Functionality Fix Report

## Problem Description
When searching for district names (e.g., "south texas") in the People panel, the districts appear correctly but show "0 people" even though there are people assigned to those districts. The search works for finding districts by name, but fails to display the people within those districts.

## Initial State
- Districts matching the search query were correctly identified and displayed
- People were not being included in the search results
- Status filter counts showed "0" for all statuses when searching

## Attempted Fixes

### Attempt 1: Expanded peopleToShow logic
**What was changed:**
- Modified the `peopleToShow` filter to include people from matching districts/regions
- Added logic to include all people from districts that match the search query
- Added logic to include people from districts that contain matching people

**Files modified:** `client/src/pages/People.tsx`
- Lines ~288-301: Updated `peopleToShow` to include people from matching districts

**Result:** Did not resolve the issue

### Attempt 2: Added campus-based matching
**What was changed:**
- Added `campusInMatchingDistrict` check to include people whose campus belongs to a matching district
- Added `campusDistrictNameMatches` fallback to check campus district names directly
- Added `personDistrictNameMatches` to check person's district name directly

**Files modified:** `client/src/pages/People.tsx`
- Lines ~298-340: Enhanced filtering logic with multiple fallback checks

**Result:** Did not resolve the issue

### Attempt 3: Fixed grouping logic to use campus districtId
**What was changed:**
- Modified the grouping logic to use the campus's `districtId` when a person is in a campus
- Added fallback logic to find districts by name if ID lookup fails

**Files modified:** `client/src/pages/People.tsx`
- Lines ~321-340: Updated grouping logic to prioritize campus districtId

**Result:** Did not resolve the issue

### Attempt 4: Simplified person district matching
**What was changed:**
- Completely rewrote the `peopleToShow` filter to:
  1. Find each person's district (via `primaryDistrictId` or campus's `districtId`)
  2. Check if the district name matches the search query
  3. Check if the district ID is in `matchingDistrictIds`
  4. Check if the region matches

**Files modified:** `client/src/pages/People.tsx`
- Lines ~298-339: Simplified filtering logic

**Result:** Did not resolve the issue

### Attempt 5: Enhanced grouping with name-based fallback
**What was changed:**
- Added comprehensive fallback logic in the grouping step:
  - First try to find district by ID
  - If not found and searching, try to find by exact district name match
  - If still not found and district name matches query, find any district matching the query

**Files modified:** `client/src/pages/People.tsx`
- Lines ~341-376: Enhanced grouping with multiple fallback strategies

**Result:** Did not resolve the issue

### Attempt 6: Complete rewrite of grouping logic
**What was changed:**
- Completely rewrote the grouping logic to:
  1. First find the person's actual district (by ID or via campus)
  2. Try to find it in `districtMap` by ID first
  3. If not found and searching, try to find by matching district name
  4. If still not found and person's district name matches search, find any district matching the search
- Fixed bug where `campusId` was used but not defined

**Files modified:** `client/src/pages/People.tsx`
- Lines ~341-390: Complete rewrite of grouping logic

**Result:** Status unknown - needs testing

## Current Code Structure

### Filtering Logic (`peopleToShow`)
Located at lines ~298-339 in `client/src/pages/People.tsx`:
- Finds person's district (via `primaryDistrictId` or campus's `districtId`)
- Checks if district name includes the search query
- Checks if district ID is in `matchingDistrictIds`
- Checks if region matches
- Includes person if any of these match

### Grouping Logic
Located at lines ~341-390 in `client/src/pages/People.tsx`:
- Finds person's actual district (by ID or via campus)
- Tries to find district in `districtMap` by ID first
- Falls back to name-based matching if ID doesn't work
- Groups people into districts/campuses

### District Matching Logic
Located at lines ~265-292 in `client/src/pages/People.tsx`:
- Identifies which districts match the search query by name
- Identifies which regions match the search query
- Adds matching district IDs to `matchingDistrictIds` set
- Adds matching region names to `matchingRegionNames` set

## Potential Root Causes

1. **Data Structure Mismatch**: The district IDs in the database might not match the district IDs used in `primaryDistrictId` or campus `districtId` fields. District IDs are slugs (e.g., "SouthTexas") while names are full names (e.g., "South Texas").

2. **Missing District Data**: People might have `primaryDistrictId` or campuses might have `districtId` that don't exist in `allDistricts`, causing the lookup to fail.

3. **Null/Undefined Values**: People might not have `primaryDistrictId` set, and their campuses might not have `districtId` set, causing them to be skipped.

4. **Case Sensitivity**: There might be case sensitivity issues in the matching logic, though we're using `.toLowerCase()`.

5. **Timing Issue**: The `peopleToShow` might be calculated before `allDistricts` or `allCampuses` are fully loaded.

## Recommendations for Further Investigation

1. **Add Console Logging**: Add console.log statements to verify:
   - How many people are in `peopleToShow` after filtering
   - What districts are being matched
   - What district IDs people have vs what districts exist
   - Whether the grouping logic is finding districts correctly

2. **Check Data Consistency**: Verify that:
   - All people have valid `primaryDistrictId` or are in campuses with valid `districtId`
   - All district IDs in the database match the IDs used in people/campuses
   - District names are consistent

3. **Test with Specific Data**: Test with a known person in "South Texas" district:
   - What is their `primaryDistrictId`?
   - What district does that ID map to?
   - Does that district's name include "south texas"?

4. **Consider Alternative Approach**: Instead of trying to match by ID and falling back to name, consider:
   - Always matching by district name when searching
   - Creating a reverse lookup map from district names to district IDs
   - Grouping people by district name first, then mapping to district IDs

## Files Modified
- `client/src/pages/People.tsx` - Multiple changes to filtering and grouping logic

## Current Status
The code has been modified multiple times with various approaches, but the issue persists. The most recent changes (Attempt 6) represent a complete rewrite of the grouping logic with comprehensive fallback strategies. Testing is needed to determine if this resolves the issue.
