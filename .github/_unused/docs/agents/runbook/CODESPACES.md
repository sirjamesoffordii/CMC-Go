# Codespaces Runbook

## Purpose

Use GitHub Codespaces for a consistent, DB-backed dev environment without installing Node/MySQL locally.

CMC Go is MySQL-backed and has a meaningful amount of DB/seed tooling; Codespaces is most valuable when you need a clean, reproducible environment that behaves closer to CI.

## What Codespaces is (in this repo)

- A cloud dev machine running a **devcontainer** defined by `.devcontainer/`.
- It typically boots:
  - an **app container** (Node + pnpm)
  - a **MySQL container**
- VS Code attaches to the container so `pnpm dev`, DB scripts, tests, etc. run inside the container.

## Policy: when to use Codespaces

Default to local worktrees for small, UI-only edits.

Prefer Codespaces when one or more are true:

- **DB-backed work:** schema/migrations, seed/import, query debugging, DB health-check failures.
- **"Clean repro" needed:** you can’t reproduce locally, or want to match CI-like Linux behavior.
- **Onboarding/new machine:** avoid local MySQL setup and PATH/WSL friction.
- **High-collision surfaces:** you want an isolated environment per branch/PR.

Avoid Codespaces when:

- **Long-running "watch" sessions** where local dev is already stable (cost control).
- You’re doing **tiny docs-only** changes.

## Cost controls (personal account)

Codespaces usage is billed separately from Copilot.

Recommended defaults:

- Start with a **small machine** for docs/UI-only work.
- Use a **medium machine** when you need MySQL + seed/test loops.

Hard rules:

- **Stop** the Codespace when you’re not using it.
- **Delete** unused Codespaces to free storage.
- Set a **spending limit** in GitHub Billing → Codespaces.

To see your real usage/limits:

- GitHub web: Settings → Billing and plans → Codespaces
- CLI (requires scope): `gh auth refresh -h github.com -s codespace`

## Quickstart (inside the Codespace)

1) Install deps (usually runs automatically on first create):

- `pnpm install`

2) Database setup (choose one):

- Fresh/blank dev DB: `pnpm db:reset`
- Existing schema: `pnpm db:setup`

3) Run the app:

- `pnpm dev`

4) Optional verification:

- `pnpm db:check`
- `pnpm db:verify`

## Common tasks

### Reset seed data

- `pnpm db:reset`

### Push schema quickly (dev-only)

- `pnpm db:push:yes`

### Troubleshooting

If the server fails its startup DB health check:

- Run `pnpm db:migrate` (migration path) or `pnpm db:push:yes` (dev sync)
- Then `pnpm db:check`

If the map shows no data:

- Confirm seeds ran: `pnpm db:check`
- Remember the invariant: `districts.id` must match SVG path ids.

## Notes for agents

- Codespaces is **interactive dev tooling**. Automated Copilot issue-handoff does not automatically run in your Codespace.
- When an Issue requires DB-backed verification (labels like `evidence:db-or-ci`), Codespaces can be used as a repeatable local-like DB environment, but CI evidence is still preferred when available.
