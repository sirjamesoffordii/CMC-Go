# Copilot Instructions — CMC Go

CMC Go is a **map-first coordination app**: React client in `client/`, tRPC+Express server in `server/`, MySQL via Drizzle in `drizzle/`.

## Read-first (once per session)

- **CMC Go Project (command center):** https://github.com/users/sirjamesoffordii/projects/4
- Policy: `AGENTS.md`
- Your role: `.github/agents/tech-lead.agent.md` or `.github/agents/software-engineer.agent.md`
- Loop: `.github/prompts/loop.prompt.md`

Ops/CI/tooling reference (as-needed):

- `.github/_unused/docs/agents/operational-procedures/OPERATIONAL_PROCEDURES_INDEX.md`

## Guardrails

- Use GitHub Issues/PRs as the task bus.
- Worktrees are required; do not work directly on `staging`.
- Keep diffs small and scoped.
- Never commit secrets (`.env*` stays local; use platform/GitHub secrets).

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
- Local DB (Docker): `docker-compose up -d` (MySQL 8.0, see `docker-compose.yml`)

## Pre-commit hooks

Husky + lint-staged automatically format staged files on commit. No manual action needed.

If you touch schema or auth/scope logic, keep the change surgical and expect CI to run MySQL-backed tests (see `.github/workflows/test-and-coverage.yml`).
