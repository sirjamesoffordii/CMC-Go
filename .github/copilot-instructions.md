# Copilot Instructions — CMC Go

CMC Go is a **map-first coordination app**: React client in `client/`, tRPC+Express server in `server/`, MySQL via Drizzle in `drizzle/`.

## Read-first (agent entrypoints)

- Multi-agent operating manual: `AGENTS.md`
- Authority docs: `docs/authority/CMC_OVERVIEW.md` and `docs/authority/BUILD_MAP.md`
- Role files (if you’re running a role-specific agent):
	- `.github/agents/coordinator.agent.md`
	- `.github/agents/explorer.agent.md`
	- `.github/agents/builder.agent.md`
	- `.github/agents/verifier.agent.md`
	- `.github/agents/browser-operator.agent.md`

## Multi-agent workflow (canonical)

- **User (Human): Sir James** sets direction.
- **Coordinator** sequences work via Issues/PRs.
- **Explorer** investigates + de-risks.
- **Builder** implements changes in an isolated worktree + opens PRs.
- **Verifier** independently validates acceptance criteria + posts evidence.
- **Browser Operator** does web-console/visual checks (Railway/Sentry/Codecov).

Rules:
- Use **GitHub Issues/PRs as the task bus**.
- **Worktrees are required**; do not work directly on `staging`.
- Keep diffs small; avoid drive-by refactors.
- Never commit secrets (`.env*` stays local; use platform/GitHub secrets).

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
