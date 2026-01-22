---
name: Quick Reference
description: One-page cheatsheet for CMC Go agent operations.
applyTo: "**"
---

# CMC Go - Quick Reference

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start dev server (wt-main only) |
| `pnpm check` | TypeScript check |
| `pnpm test` | Run unit tests |
| `pnpm e2e` | Playwright smoke tests |
| `pnpm db:push:yes` | Push schema to dev DB |
| `pnpm db:seed` | Seed dev database |
| `pnpm db:reset` | Reset database |
| `pnpm validate:agents` | Validate agent files |

## Evidence gates

| Change type | Minimum evidence |
|-------------|------------------|
| TypeScript only | `pnpm check` |
| Server/client logic | `pnpm check` + `pnpm test` |
| UI flow changed | Above + `pnpm e2e` |
| Schema change | Above + `pnpm db:push:yes` |

## Verification levels

| Label | Who verifies | Evidence |
|-------|--------------|----------|
| `verify:v0` | Author | Self-verify + evidence |
| `verify:v1` | Peer | Approval + evidence |
| `verify:v2` | Peer | Approval + `evidence:*` labels |

## Worktree naming (Mode A only)

| Worktree | Purpose |
|----------|---------|
| `wt-main` | Dev server only |
| `wt-impl-<issue#>-<slug>` | Implementation |
| `wt-verify-<pr#>-<slug>` | Verification |
| `wt-docs-<YYYY-MM-DD>` | Docs changes |

## Branch naming

| Actor | Pattern |
|-------|---------|
| Agent | `agent/<agent>/<issue#>-<slug>` |
| User | `user/sir-james/<issue#>-<slug>` |

## Commit prefix

| Actor | Prefix |
|-------|--------|
| Agent | `agent(<agent>): <summary>` |
| User | `user(sir-james): <summary>` |

## Hard invariants (never break)

- `districts.id` must match `map.svg` path IDs (case-sensitive)
- `people.personId` is the cross-table key
- Status values: `Yes`, `Maybe`, `No`, `Not Invited`

## Key files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Operating policy |
| `.github/agents/CMC_GO_BRIEF.md` | Product snapshot |
| `.github/agents/CMC_GO_PATTERNS.md` | Pitfalls/patterns |
| `drizzle/schema.ts` | Database schema |
| `server/routers.ts` | API surface |

## Escalation template

```
- **Status:** Blocked
- **Decision needed:** <one sentence>
- **Why it matters:** <one sentence>
- **Options:** A) ... / B) ... / C) ...
- **Recommended default (if no response by <time>):** <A/B/C>
- **Evidence:** <links / 3-10 key lines>
- **Parallel work I will do now:** <short list>
```

## PR description template

```
## Why
Closes #<issue>

## What changed
- 

## How verified
pnpm check
pnpm test

## Risk
**Risk:** low/med/high
```

## Verification verdict template

```
- **Result:** Pass / Pass-with-notes / Fail
- **Evidence:** commands + key output
- **Notes/Risks:** gaps, flakiness, edge cases
```
