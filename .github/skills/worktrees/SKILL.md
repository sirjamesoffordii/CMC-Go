# Skill: Worktrees (fast parallel work without collisions)

## Standard worktrees

- `wt-main`: primary worktree (only one running `pnpm dev`)
- `wt-impl-<issue#>-<short>`: Builder worktree for implementation
- `wt-verify-<issue#>-<short>`: Verifier worktree for checks/tests
- `wt-docs-<YYYY-MM-DD>`: docs-only changes

## Creation

From repo root:

- `git worktree add ../.worktrees/wt-impl-123-fix-filter staging`
- `git worktree add ../.worktrees/wt-verify-123-fix-filter staging`

Then `pnpm install` once per worktree if needed.

## Cleanup

After merge:
- `git worktree remove ../.worktrees/wt-impl-123-fix-filter`
- `git branch -D wt-impl-123-fix-filter`
