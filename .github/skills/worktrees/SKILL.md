# Skill: Worktrees (CMC Go)

Use worktrees to avoid collisions between agents.

## Standard worktrees

- `wt-main` — primary worktree (only one runs `pnpm dev`)
- `wt-impl-<issue#>-<slug>` — implementation
- `wt-verify-<pr#>-<slug>` — peer verification
- `wt-docs-<YYYY-MM-DD>` — docs-only

## Canonical commands

> Note: adjust paths as needed. The directory names are conventions.

Create worktree:

- From repo root:
  - `git worktree add ../wt-impl-123-fix-login -b agent/bravo/123-fix-login`

List worktrees:
- `git worktree list`

Remove worktree:
- `git worktree remove ../wt-impl-123-fix-login`

Prune stale:
- `git worktree prune`

## Safety rules
- Never run two dev servers bound to the same port simultaneously.
- Only `wt-main` runs `pnpm dev`.
- Verification worktrees must not run dev server; they run tests/checks.
