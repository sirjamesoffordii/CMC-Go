---
applyTo: "**/*.{ts,tsx,js,mjs}"
excludeAgent: ["code-review"]
---

# CMC Go Codebase Guardrails

Global rules and patterns for all agents working in this codebase.

## Hard Invariants (NEVER break)

- `districts.id` must match `client/public/map.svg` path IDs (case-sensitive)
- `people.personId` (varchar) is the cross-table/import key — preserve semantics
- Status values: `Yes`, `Maybe`, `No`, `Not Invited` — exact strings
- PRs always target `staging` branch
- Keep diffs small — split into multiple PRs if needed

For workflow details (modes, delegation, PR templates, reflection format), use `AGENTS.md` as the canonical reference.

## Evidence Gates

Run these based on what you changed:

| Change type         | Minimum evidence           |
| ------------------- | -------------------------- |
| TypeScript only     | `pnpm check`               |
| Server/client logic | `pnpm check` + `pnpm test` |
| UI flow changed     | Above + `pnpm e2e`         |
| Schema change       | Above + `pnpm db:push:yes` |
