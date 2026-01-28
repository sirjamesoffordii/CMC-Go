---
applyTo: "drizzle/**/*.ts"
---

# Drizzle Schema Standards for CMC Go

## Schema Invariants (NEVER CHANGE)

These are hard invariants that must be preserved:

1. **`districts.id`** (DistrictSlug) must match `client/public/map.svg` `<path id="...">` values exactly (case-sensitive)
2. **`people.personId`** (varchar) is the cross-table/import key - preserve its semantics
3. **Status enum strings** are fixed: `Yes`, `Maybe`, `No`, `Not Invited`

## Table Definitions

- Use `mysqlTable()` from `drizzle-orm/mysql-core`
- Define primary keys with `primaryKey()`
- Use appropriate column types: `varchar`, `int`, `boolean`, `timestamp`, `text`
- Add `notNull()` constraints explicitly

## Relations

- Define relations in `drizzle/relations.ts`
- Use `one()` for belongs-to relationships
- Use `many()` for has-many relationships
- Ensure foreign key references match primary key types

## Naming Conventions

- Table names: snake_case plural (e.g., `districts`, `people`, `campuses`)
- Column names: snake_case (e.g., `person_id`, `created_at`)
- Relation fields: camelCase matching the related table

## Timestamps

- Use `timestamp('created_at').defaultNow()` for creation timestamps
- Use `timestamp('updated_at').defaultNow().onUpdateNow()` for update timestamps

## Migrations

- Migrations live in `drizzle/migrations/`
- Run `pnpm db:push:yes` for development schema sync
- Never modify existing migration files
- Test migrations with `pnpm db:reset` before committing

## Index Considerations

- Add indexes for frequently queried columns
- Foreign key columns should typically be indexed
- Consider composite indexes for common query patterns
