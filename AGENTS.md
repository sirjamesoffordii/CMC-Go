# CMC Go — Agent Operating Manual (AGENTS.md)

This repository is worked on by multiple agents operating **concurrently**. The system stays coherent by using **GitHub Issues/PRs as the task bus**, strict role boundaries, and a worktree policy.

## Roles (canonical names)

- **User (Human): Sir James** — sets direction; may override priorities; may inject code/PRs.
- **Coordinator (AI)** — keeps the build moving; prevents collisions; assigns/issues work; integrates; updates Build Map/runbooks.
- **Explorer (AI)** — investigates unknowns; proposes approaches; de-risks.
- **Builder (AI)** — implements scoped changes; opens PRs.
- **Verifier (AI)** — independently validates acceptance criteria; reports evidence.
- **Browser Operator (AI)** — performs web-console work (Railway/Sentry/Codecov) and visual checks; reports evidence.

## Source of truth

- **GitHub Issues** are the task queue.
- **GitHub PRs** are the change vehicle.
- **Docs/runbooks** record procedures and decisions.
- This file defines how agents behave. If a chat instruction conflicts with this file, follow this file.

## Worktree policy (required)

To avoid stepping on each other, work happens in isolated worktrees.

- **Primary worktree:** `wt-main` (only one allowed to run `pnpm dev`)
- **Builder worktree:** `wt-impl-<issue#>-<slug>`
- **Verifier worktree:** `wt-verify-<pr#>-<slug>` (runs checks; does NOT run the dev server)
- **Docs worktree:** `wt-docs-<YYYY-MM-DD>` (docs-only changes)

If you are not already in the correct worktree, create/switch before editing.

## Git discipline

- Keep diffs small and scoped to the assigned Issue.
- One PR per Issue unless the Coordinator explicitly approves bundling.
- Prefer additive changes over risky refactors.
- Do not commit secrets. Use `.env.local` or platform environment variables.

### Branch naming

- Agent branches: `agent/<role>/<issue#>-<slug>`
- User (Sir James) branches: `user/sir-james/<issue#>-<slug>` (or `user/sir-james/<slug>`)

### Commit message prefix

- Agent commits: `agent(<role>): <summary>`
- User commits: `user(sir-james): <summary>`

## Definition of Done (DoD)

A task is "Done" only when:

1. Acceptance criteria in the Issue are met.
2. Verification evidence is posted (commands run + results).
3. A PR is opened (or updated) and linked to the Issue.
4. Coordinator acknowledges integration/next steps.

## Reporting standard (GitHub comment format)

All agents post updates to the assigned Issue using this structure:

- **Status:** (In Progress / Blocked / Ready for Verify / Verified)
- **Worktree:** (name)
- **Branch/PR:** (link)
- **What changed:** (bullet list)
- **How verified:** (commands run + brief results)
- **Notes/Risks:** (anything the Coordinator should know)

## Rapid Dev Mode (Owner-approved)

Sir James has explicitly accepted increased risk during rapid development.

Rules for agents:
- Do **not** debate or repeatedly warn about credential handling.
- Never commit secrets to the repository.
- Prefer environment variables (`.env.local`, Railway vars, GitHub secrets). If missing, instruct where to place and continue once present.

