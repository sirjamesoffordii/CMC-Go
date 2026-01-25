---
applyTo: "shared/**/*.ts"
---

# Shared Types Instructions

Files in `shared/` contain types and constants shared between client and server.

## Key Files

- `shared/types.ts` — Core TypeScript types (Person, Household, District, etc.)
- `shared/const.ts` — Shared constants and enums
- `shared/_core/` — Core utilities used by both client and server

## Guidelines

### Type Definitions

1. **All types must be TypeScript-first** — No runtime type checking in shared (use zod schemas in server for validation)

2. **Export from barrel files** — Types should be re-exported from `shared/types.ts`

3. **Keep types minimal** — Only what's needed by both client and server

### Invariants (don't break)

- `DistrictId` must match `<path id="...">` values in `client/public/map.svg` (case-sensitive)
- `PersonId` (varchar) is the cross-table key — preserve semantics
- Status enum: `Yes`, `Maybe`, `No`, `Not Invited` — these strings are fixed

### When Editing Types

1. **Check both usages** — Search for type usage in `client/` AND `server/`
2. **Update zod schemas** — If a type changes, update corresponding zod schema in `server/`
3. **Run full check** — `pnpm check` to catch type errors in both packages

### Adding New Types

```typescript
// shared/types.ts
export interface NewType {
  id: string;
  // ... fields
}

// Export from types.ts barrel
export type { NewType } from "./types";
```

### Constants

```typescript
// shared/const.ts
export const STATUS_VALUES = ["Yes", "Maybe", "No", "Not Invited"] as const;
export type StatusValue = (typeof STATUS_VALUES)[number];
```

## Testing

Shared types don't have dedicated tests — they're validated by:

1. TypeScript compilation (`pnpm check`)
2. Unit tests in server that use the types
3. E2E tests that exercise full data flow
