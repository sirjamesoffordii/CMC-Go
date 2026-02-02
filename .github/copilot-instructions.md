# Copilot Instructions — CMC Go

CMC Go is a **map-first coordination app**: React client in `client/`, tRPC+Express server in `server/`, MySQL via Drizzle in `drizzle/`.

## 5-Second Decision Tree

```
START
  │
  ├─ Am I Principal Engineer?
  │   ├─ YES → Check TL heartbeat → Spawn TL if missing → Run planning epoch
  │   └─ NO → Continue below
  │
  ├─ Am I Tech Lead?
  │   ├─ YES → Check board → Delegate to SE or review PRs
  │   └─ NO → Am I Software Engineer?
  │           ├─ YES → Claim Todo → EXPLORE → IMPLEMENT → VERIFY → Loop
  │           └─ NO → Check AGENTS.md for your role
  │
  └─ Is the board empty?
      ├─ YES → Run Cold Start Procedure (see AGENTS.md)
      └─ NO → Pick highest-priority Todo item
```

## Read-first (once per session)

- **CMC Go Project (command center):** https://github.com/users/sirjamesoffordii/projects/4
- Policy: `AGENTS.md`
- Your role: `.github/agents/tech-lead.agent.md` or `.github/agents/software-engineer.agent.md`
- Loop: `.github/prompts/loop.prompt.md`

Ops/CI/tooling reference (as-needed):

- `.github/_unused/docs/agents/operational-procedures/OPERATIONAL_PROCEDURES_INDEX.md`

## Where rules live (anti-drift)

- **This file (`.github/copilot-instructions.md`)**: stable repo overview + invariants + key commands.
- **`AGENTS.md`**: canonical operating manual (workflow, delegation, evidence, templates).
- **`.github/agents/*.agent.md`**: role-specific behavior (shows up in the VS Code agent dropdown when you pick a custom agent).
- **`.github/instructions/*.instructions.md`**: path-scoped coding conventions (React, tRPC, Drizzle, tests, etc.).

## Guardrails

- Use GitHub Issues/PRs as the task bus.
- One Software Engineer at a time to prevent merge conflicts.
- Keep diffs small and scoped.
- Never commit secrets (`.env*` stays local; use platform/GitHub secrets).

## Agent Architecture (1 PE, 1 TL, 1 SE)

```
PE (continuous) → monitors, creates issues, spawns TL
  └── TL (continuous) → delegates, reviews, spawns SE via worktree
        └── SE (continuous) → implements in isolated worktree
```

**Constraints:**

- Only 1 of each agent type at a time
- SE MUST work in worktree (`C:/Dev/CMC-Go-Worktrees/wt-se`)
- TL spawns SE via `.\scripts\spawn-worktree-agent.ps1` only
- Main workspace is for PE/TL coordination only

## Project invariants (don’t break)

- `districts.id` (“DistrictSlug”) must match `client/public/map.svg` `<path id="...">` values (case-sensitive).
- `people.personId` (varchar) is the cross-table/import key; preserve its semantics.
- Status enum strings are fixed: `Yes`, `Maybe`, `No`, `Not Invited`.

## Key entrypoints

- Server entry: `server/_core/index.ts` (dotenv loads before Sentry init; startup DB health checks).
- API surface: `server/routers.ts` (tRPC `publicProcedure`/`protectedProcedure`; scope enforced by `server/_core/authorization.ts`).
- Schema: `drizzle/schema.ts` (authoritative; used by scripts and server/db helpers).

## Commands

- Dev: `pnpm dev`
- Checks: `pnpm check`, `pnpm test`, `pnpm lint`
- E2E (smoke): `pnpm e2e`
- DB (dev): `pnpm db:push:yes`, `pnpm db:seed`, `pnpm db:reset`
- Validation: `pnpm validate:agents`

## Branch Strategy

- **`staging`** — Safe place to fail and recover. All agent PRs target here.
- **`main`** — Protected branch. Merges from `staging` after verification.
- Agents always branch from and PR into `staging`.

## Pre-commit hooks

Husky + lint-staged automatically format staged files on commit. No manual action needed.

If you touch schema or auth/scope logic, keep the change surgical and expect CI to run MySQL-backed tests (see `.github/workflows/test-and-coverage.yml`).
