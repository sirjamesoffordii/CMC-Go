# Migration Guide

This is a practical workflow reference. For non-negotiable rules, see [MIGRATION_RULES.md](MIGRATION_RULES.md).

## Source of truth

- Schema: `drizzle/schema.ts`
- Migration runner: `pnpm db:migrate` (uses `scripts/run-migrations.mjs`)

## Local workflows

### Fresh / blank database

```bash
pnpm db:setup
```

### After changing `drizzle/schema.ts`

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:check
```

### Dev-only shortcut (avoid on staging/prod)

```bash
pnpm db:push:yes
```

## Staging / production

- Apply schema changes with `pnpm db:migrate` only.
- Keep migrations additive/backward-compatible.

## Quick verification

```bash
pnpm db:check
pnpm db:verify
```
