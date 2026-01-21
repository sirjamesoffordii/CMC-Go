# Copilot Instructions — CMC Go

CMC Go is a **map-first coordination app**: React client in `client/`, tRPC+Express server in `server/`, MySQL via Drizzle in `drizzle/`.

## Read-first (agent entrypoints)

- Multi-agent operating manual: `AGENTS.md`
- Authority docs: `docs/authority/CMC_OVERVIEW.md` and `docs/authority/BUILD_MAP.md`
- Universal agent files (preferred):
	- `.github/agents/alpha.agent.md`
	- `.github/agents/bravo.agent.md`
	- (future) `.github/agents/charlie.agent.md`
- Specialized agent (console/visual checks):
	- `.github/agents/browser-operator.agent.md`

## Multi-agent workflow (canonical)

- **User (Human): Sir James** sets direction.
- **Alpha** runs first: syncs Project/Issues, deconflicts, clarifies acceptance criteria.
- **Bravo** runs second: implements changes and/or performs peer verification with evidence.
- **Charlie** (optional/future): adds parallelism for deeper verification and ops checks.

Alpha/Bravo/Charlie are **universal agents**. Names are a convention to coordinate work, not hard capability boundaries.

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
