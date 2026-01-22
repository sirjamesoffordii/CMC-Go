# Copilot Instructions — CMC Go

CMC Go is a **map-first coordination app**: React client in `client/`, tRPC+Express server in `server/`, MySQL via Drizzle in `drizzle/`.

## Read-first (agent entrypoints)

- Operating manual: `.github/agents/AGENTS.md`
- CMC Go brief: `.github/agents/CMC_GO_BRIEF.md`
- Operational status board (Projects v2): https://github.com/users/sirjamesoffordii/projects/2

Role files:
	- `.github/agents/tech-lead.agent.md`
	- `.github/agents/software-engineer.agent.md`

## Multi-agent workflow (canonical)

- **User (Human): Sir James** sets direction.
- **Tech Lead (TL)** runs first: syncs Project/Issues, deconflicts, clarifies acceptance criteria.
- **Software Engineer (SWE)** runs second: implements changes and/or performs peer verification with evidence.

Priority:
- Clear the **review/verify queue** first (items labeled `status:verify`), otherwise implement.

Rules:
- Use **GitHub Issues/PRs as the task bus**.
- **Worktrees are required**; do not work directly on `staging`.
- Keep diffs small; avoid drive-by refactors.
- Never commit secrets (`.env*` stays local; use platform/GitHub secrets).

Verification:
- **L0**: self-verify for low-risk tasks.
- **L1/L2**: peer verification required (another agent posts evidence + verdict).

## Project invariants (don’t break)

- `districts.id` (“DistrictSlug”) must match `client/public/map.svg` `<path id="...">` values (case-sensitive).
- `people.personId` (varchar) is the cross-table/import key; preserve its semantics.
- Status enum strings are fixed: `Yes`, `Maybe`, `No`, `Not Invited`.

## Key entrypoints

- Server entry: `server/_core/index.ts` (dotenv loads before Sentry init; startup DB health checks).
- API surface: `server/routers.ts` (tRPC `publicProcedure`/`protectedProcedure`; scope enforced by `server/_core/authorization.ts`).
- Schema: `drizzle/schema.ts` (authoritative; used by scripts and server/db helpers).

## Commands (most used)

- Dev: `pnpm dev`
- Typecheck/tests: `pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm e2e`
- DB: `pnpm db:push:yes` (dev sync), `pnpm db:seed`, `pnpm db:check`, `pnpm db:reset`

If you touch schema or auth/scope logic, keep the change surgical and expect CI to run MySQL-backed tests (see `.github/workflows/test-and-coverage.yml`).

