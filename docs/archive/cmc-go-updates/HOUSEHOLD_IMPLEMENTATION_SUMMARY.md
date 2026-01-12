# Household Linking Implementation Summary

## ✅ Completed

### 1. Database Schema (`drizzle/schema.ts`)
- ✅ Added `households` table with:
  - `id` (int, primary key, autoincrement)
  - `label` (varchar, nullable)
  - `childrenCount` (int, default 0)
  - `guestsCount` (int, default 0)
  - `createdAt`, `updatedAt` timestamps
- ✅ Updated `people` table with:
  - `householdId` (int, nullable FK to households.id)
  - `householdRole` (enum: "primary" | "member", default "primary")
  - Marked `kids` and `guests` as deprecated (use household instead)

### 2. Server Functions (`server/db.ts`)
- ✅ `getAllHouseholds()` - Get all households
- ✅ `getHouseholdById(id)` - Get household by ID
- ✅ `getHouseholdMembers(householdId)` - Get all people in a household
- ✅ `searchHouseholds(query)` - Search by label or member names
- ✅ `createHousehold(data)` - Create new household
- ✅ `updateHousehold(id, data)` - Update household counts/label
- ✅ `deleteHousehold(id)` - Delete household and unlink members

### 3. API Endpoints (`server/routers.ts`)
- ✅ `households.list` - List all households
- ✅ `households.getById` - Get household by ID
- ✅ `households.getMembers` - Get household members
- ✅ `households.search` - Search households
- ✅ `households.create` - Create household
- ✅ `households.update` - Update household
- ✅ `households.delete` - Delete household
- ✅ Updated `people.create` to accept `householdId` and `householdRole`
- ✅ Updated `people.update` to accept `householdId` and `householdRole`

### 4. Client Form State (`client/src/components/DistrictPanel.tsx`)
- ✅ Added household fields to `personForm`:
  - `householdId: number | null`
  - `householdChildrenCount: number`
  - `householdGuestsCount: number`
- ✅ Added household queries:
  - `trpc.households.list.useQuery()`
  - `trpc.households.search.useQuery()`
- ✅ Added household mutations:
  - `createHousehold` mutation
  - `updateHousehold` mutation

## 🚧 Remaining Work

### 1. UI Updates (`client/src/components/DistrictPanel.tsx`)

#### Replace "Accompanying Non Staff" Section
**Location:** Lines ~1570-1626

Replace with:
```tsx
{/* Family & Guests (optional) */}
<div className="space-y-4 mt-4">
  <div className="border-b border-slate-200 pb-2">
    <h3 className="text-sm font-semibold text-slate-700">Family & Guests (optional)</h3>
  </div>
  
  {/* Household Selection */}
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Label htmlFor="person-household">Household (optional)</Label>
        <Select
          value={personForm.householdId?.toString() || ''}
          onValueChange={(value) => {
            const householdId = value ? parseInt(value) : null;
            const household = allHouseholds.find(h => h.id === householdId);
            setPersonForm({ 
              ...personForm, 
              householdId,
              householdChildrenCount: household?.childrenCount || 0,
              householdGuestsCount: household?.guestsCount || 0,
            });
          }}
        >
          <SelectTrigger id="person-household">
            <SelectValue placeholder="Select household" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {allHouseholds.map((household) => {
              const members = // Get members via query
              const displayName = household.label || 
                `${members[0]?.name.split(' ').pop() || 'Household'} Household`;
              return (
                <SelectItem key={household.id} value={household.id.toString()}>
                  {displayName}
                  {members.length > 0 && (
                    <span className="text-xs text-slate-500 ml-2">
                      ({members.map(m => m.name).join(', ')})
                    </span>
                  )}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          // Create new household and link person as primary
          createHousehold.mutate({
            label: `${personForm.name.split(' ').pop()} Household`,
            childrenCount: 0,
            guestsCount: 0,
          });
        }}
      >
        Create Household
      </Button>
    </div>
  </div>
  
  {/* Counts Section */}
  {personForm.householdId ? (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="household-children">Children attending (0-10)</Label>
        <Input
          id="household-children"
          type="number"
          min="0"
          max="10"
          value={personForm.householdChildrenCount}
          onChange={(e) => {
            const count = parseInt(e.target.value) || 0;
            setPersonForm({ ...personForm, householdChildrenCount: count });
            updateHousehold.mutate({
              id: personForm.householdId!,
              childrenCount: count,
            });
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="household-guests">Guests attending (0-10)</Label>
        <Input
          id="household-guests"
          type="number"
          min="0"
          max="10"
          value={personForm.householdGuestsCount}
          onChange={(e) => {
            const count = parseInt(e.target.value) || 0;
            setPersonForm({ ...personForm, householdGuestsCount: count });
            updateHousehold.mutate({
              id: personForm.householdId!,
              guestsCount: count,
            });
          }}
        />
      </div>
    </div>
  ) : (
    <div className="text-sm text-slate-500 italic">
      Link a household to add shared counts.
    </div>
  )}
</div>
```

#### Update Form Resets
Update all `setPersonForm` calls to include:
```tsx
householdId: null,
householdChildrenCount: 0,
householdGuestsCount: 0,
```

#### Update Person Creation/Update Logic
In `handleAddPerson` and `handleUpdatePerson`, add:
```tsx
if (personForm.householdId) {
  mutationData.householdId = personForm.householdId;
  mutationData.householdRole = 'primary'; // or 'member' if linking to existing
}
```

#### Update Edit Person Form Population
In the `useEffect` that populates form when editing, add:
```tsx
const household = person.householdId ? 
  allHouseholds.find(h => h.id === person.householdId) : null;
setPersonForm({
  // ... existing fields
  householdId: person.householdId || null,
  householdChildrenCount: household?.childrenCount || 0,
  householdGuestsCount: household?.guestsCount || 0,
});
```

### 2. PersonTooltip Update (`client/src/components/PersonTooltip.tsx`)

Replace lines 62-80 with:
```tsx
{/* Family & Guests */}
{(person.householdId || (person.kids && parseInt(person.kids) > 0) || (person.guests && parseInt(person.guests) > 0)) && (
  <div className="mb-2 space-y-1">
    <div className="text-xs font-semibold text-gray-700">Family & Guests:</div>
    {person.householdId ? (
      // Show household counts
      <>
        {household?.childrenCount > 0 && (
          <div className="text-xs text-gray-600">
            Children: <span className="font-medium">{household.childrenCount}</span>
          </div>
        )}
        {household?.guestsCount > 0 && (
          <div className="text-xs text-gray-600">
            Guests: <span className="font-medium">{household.guestsCount}</span>
          </div>
        )}
      </>
    ) : (
      // Fallback to person counts (for backwards compatibility)
      <>
        {person.kids && parseInt(person.kids) > 0 && (
          <div className="text-xs text-gray-600">
            Children: <span className="font-medium">{person.kids}</span>
          </div>
        )}
        {person.guests && parseInt(person.guests) > 0 && (
          <div className="text-xs text-gray-600">
            Guests: <span className="font-medium">{person.guests}</span>
          </div>
        )}
      </>
    )}
  </div>
)}
```

Add household query to PersonTooltip:
```tsx
const { data: household } = trpc.households.getById.useQuery(
  { id: person.householdId! },
  { enabled: !!person.householdId }
);
```

### 3. Aggregation Logic Updates

#### Find All Aggregation Points
Search for places that sum `kids` or `guests`:
- `client/src/utils/districtStats.ts`
- `server/db.ts` (metrics functions)
- Any export/report generation

#### Update Aggregation Pattern
Replace:
```tsx
const totalChildren = people.reduce((sum, p) => sum + (parseInt(p.kids) || 0), 0);
const totalGuests = people.reduce((sum, p) => sum + (parseInt(p.guests) || 0), 0);
```

With:
```tsx
// Dedupe by household
const householdIds = new Set<number>();
const soloChildren = new Map<string, number>();
const soloGuests = new Map<string, number>();

people.forEach(p => {
  if (p.householdId) {
    householdIds.add(p.householdId);
  } else {
    // Solo person - use fallback counts
    soloChildren.set(p.personId, parseInt(p.kids) || 0);
    soloGuests.set(p.personId, parseInt(p.guests) || 0);
  }
});

// Sum unique households
const householdChildren = households
  .filter(h => householdIds.has(h.id))
  .reduce((sum, h) => sum + (h.childrenCount || 0), 0);
const householdGuests = households
  .filter(h => householdIds.has(h.id))
  .reduce((sum, h) => sum + (h.guestsCount || 0), 0);

// Sum solo people
const soloChildrenTotal = Array.from(soloChildren.values())
  .reduce((sum, count) => sum + count, 0);
const soloGuestsTotal = Array.from(soloGuests.values())
  .reduce((sum, count) => sum + count, 0);

const totalChildren = householdChildren + soloChildrenTotal;
const totalGuests = householdGuests + soloGuestsTotal;
```

### 4. Migration Generation

Run:
```bash
pnpm db:generate
```

This will create a new migration file in `drizzle/` directory.

Then apply it:
```bash
pnpm db:migrate
```

## Files Changed

1. ✅ `drizzle/schema.ts` - Added households table and household fields to people
2. ✅ `server/db.ts` - Added household CRUD functions
3. ✅ `server/routers.ts` - Added household endpoints and updated people endpoints
4. 🚧 `client/src/components/DistrictPanel.tsx` - Partial (form state done, UI pending)
5. 🚧 `client/src/components/PersonTooltip.tsx` - Pending
6. 🚧 `client/src/utils/districtStats.ts` - Pending (aggregation deduping)
7. 🚧 Migration file - Needs generation

## Testing Checklist

- [ ] Create household via "Create Household" button
- [ ] Link person to existing household
- [ ] Update household counts (children/guests)
- [ ] Verify counts show in tooltip
- [ ] Verify aggregation dedupes by household
- [ ] Test with married staff (both in system)
- [ ] Test with solo person (no household)
- [ ] Verify backwards compatibility (people without householdId)

