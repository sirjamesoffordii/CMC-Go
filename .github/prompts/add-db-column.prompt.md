---
name: Add Database Column
mode: agent
description: Guide through adding a new column to the database schema safely.
tools:
  - read
  - edit
  - execute
---

# Add Database Column

Guide through adding a new column to the database schema safely.

## Checklist

1. **Schema Update** (`drizzle/schema.ts`)
   - Add column with appropriate type and constraints
   - Consider nullability (new columns on existing tables should be nullable or have defaults)
   - Follow naming conventions (snake_case)

2. **Relations** (if applicable, `drizzle/relations.ts`)
   - Update relations if the column is a foreign key

3. **Migration**
   - Run `pnpm db:push:yes` for development
   - Verify with `pnpm db:seed` that data loads correctly

4. **Server Updates**
   - Update any tRPC procedures that read/write this table
   - Update input/output Zod schemas if needed

5. **Client Updates**
   - Update TypeScript types if exposed to frontend
   - Update any components that display this data

6. **Testing**
   - Add/update tests for affected procedures
   - Run `pnpm test` to verify

## Hard Invariants (NEVER BREAK)

- `districts.id` must match SVG `<path id>` values
- `people.personId` is the cross-table import key
- Status enums: `Yes`, `Maybe`, `No`, `Not Invited`

## Commands

```bash
pnpm db:push:yes  # Apply schema changes
pnpm db:seed      # Reseed development data
pnpm test         # Run tests
pnpm check        # Type check
```
