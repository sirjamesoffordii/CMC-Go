# AGENTS.md — Working effectively in this repo

This is a short, **actionable** guide for coding agents (and humans) working in `CMC-Go`.
For deeper project context, also read `.github/copilot-instructions.md` and `docs/runbooks/DEV_SETUP.md`.

## Quick start

### Install

```bash
pnpm install
```

### Configure environment

- Create `.env` in the repo root (see `.env.example`).
- **Required for most server flows**: `DATABASE_URL` (MySQL/TiDB connection string).

Example:

```env
DATABASE_URL=mysql://user:password@host:port/database
```

### Database (local dev)

Use these scripts (see `package.json` for the full list):

```bash
# Dev reset (truncate/drop, re-push schema, seed)
pnpm db:reset

# Setup without reset (init connection, push schema, seed)
pnpm db:setup

# Validate schema expectations (server startup also runs checks)
pnpm db:check
```

### Run the app

```bash
pnpm dev
```

Then open `http://localhost:3000`.

## Day-to-day commands

- **Dev server**: `pnpm dev`
- **Typecheck**: `pnpm check`
- **Format**: `pnpm format`
- **Tests**: `pnpm test` (Vitest; see `vitest.config.ts`)
- **Build**: `pnpm build` / **Run prod build**: `pnpm start`

## CI notes (important)

- GitHub Actions workflow: `.github/workflows/test-and-coverage.yml`
- CI currently provisions **Postgres** and runs a coverage job.
- If you change tests/DB access, ensure tests can run with a `DATABASE_URL` provided by CI.

## Repo layout (where to look first)

- **Frontend**: `client/` (React + Vite)
- **Backend**: `server/` (tRPC endpoints in `server/routers.ts`)
- **DB schema**: `drizzle/schema.ts` (authoritative)
- **DB scripts**: `scripts/` (`db:*` scripts in `package.json`)
- **Shared TS**: `shared/`

## Domain invariants you must not break

- **DistrictSlug ↔ SVG map IDs**: district IDs must match `<path id="...">` values in `client/public/map.svg` (case-sensitive).
- **`people.personId` is stable**: used for imports and cross-table references; avoid changing semantics.
- **Status enum strings are persistent data**: don’t rename enum values without a migration + backfill.

## Change guidelines

- **Prefer small, focused diffs**: avoid broad refactors unless explicitly requested.
- **DB changes**:
  - Update `drizzle/schema.ts`
  - Ensure local dev scripts still work (`pnpm db:check`, `pnpm db:reset` as needed)
- **API changes**:
  - Update procedures in `server/routers.ts`
  - Update/add tests in `server/*.test.ts` when behavior changes
- **Formatting**: Prettier config is in `.prettierrc`

## Safety

- Do not commit secrets or real credentials (`.env`, connection strings, API keys).
- If you need to add seed/migration scripts, keep them **idempotent** and document intent in comments.

