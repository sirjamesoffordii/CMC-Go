# CMC Go — Agent Operating Manual

This is the **single source of truth** for how humans + agents work in this repo.

## Read-first

- Product intent + invariants: [.github/agents/CMC_GO_BRIEF.md](.github/agents/CMC_GO_BRIEF.md)
- Active agent docs index: [.github/README.md](.github/README.md)
- TL role: [.github/agents/tech-lead.agent.md](.github/agents/tech-lead.agent.md)
- SWE role: [.github/agents/software-engineer.agent.md](.github/agents/software-engineer.agent.md)

Working truth (Projects v2): https://github.com/users/sirjamesoffordii/projects/2

## Operating principles

- **GitHub Issues/PRs are the task bus.** Put decisions and evidence in the Issue/PR thread.
- **Worktrees are required.** Do not work directly on `staging`.
- **Small diffs win.** Prefer surgical, reviewable changes.
- **No secrets in git.** Keep `.env*` local or use platform/GitHub secrets.

## Standard workflow

1) TL makes the work executable
- Goal + scope + acceptance criteria (AC)
- Verification checklist (what to run / what to look for)

2) SWE implements or verifies
- Implementation: smallest viable diff + evidence
- Verification: run checklist + verdict

3) Evidence is required for “Done”
- Commands run + results
- Links to PR/Issue/CI as relevant

## Roles (active)

- **Tech Lead (TL)** runs first (triage/coherence/deconflict): see [.github/agents/tech-lead.agent.md](.github/agents/tech-lead.agent.md)
- **Software Engineer (SWE)** runs second (implement + evidence, or verify): see [.github/agents/software-engineer.agent.md](.github/agents/software-engineer.agent.md)

## Worktree policy

Work happens in isolated worktrees to prevent collisions.

- `wt-main` — only place allowed to run `pnpm dev`
- `wt-impl-<issue#>-<slug>` — implementation work
- `wt-verify-<pr#>-<slug>` — verification work (no implementation)
- `wt-docs-<YYYY-MM-DD>` — docs-only changes

## Claiming work (collision prevention)

Before editing:
- Assign the Issue to yourself (preferred)
- Optionally add a claim label (e.g. `claimed:tl`, `claimed:swe`)
- Leave a short Issue comment: `CLAIMED by <TL|SWE> — <worktree>/<branch> — ETA <time>`

If you go idle/blocked, unclaim and say why.

## Branch + commit conventions

- Agent branches: `agent/<agent>/<issue#>-<slug>`
- User branches: `user/sir-james/<issue#>-<slug>`

Commit message prefix:
- Agents: `agent(<agent>): <summary>`
- Sir James: `user(sir-james): <summary>`

## Verification levels

PRs into `staging` must pass CI and be labeled for verification expectations:

- `verify:v0` — author self-verifies and posts evidence
- `verify:v1` — someone else verifies (approval + evidence)
- `verify:v2` — peer verifies + extra evidence
  - `evidence:db-or-ci` and/or `evidence:deployed-smoke` as appropriate

## Evidence standard (copy/paste)

Post updates in Issues/PRs using:

- **Status:** In Progress / Blocked / Ready for Verify / Verified
- **Worktree:** `wt-...`
- **Branch/PR:** link
- **What changed:** bullets
- **How verified:** commands run + brief results
- **Notes/Risks:** anything a reviewer should know

## Low-risk fast path (docs/tiny fixes)

Allowed only when all are true:
- ≤ ~50 LOC and 1–2 files
- no schema/auth/env contract changes
- low collision risk

Procedure:
- Use a docs worktree
- Open a PR with: Why / What changed / How verified / Risk

## Automation: Copilot auto-handoff

Label an Issue with `agent:copilot` (or `agent:copilot-tl`, `agent:copilot-swe`) to trigger:
- [.github/workflows/copilot-auto-handoff.yml](.github/workflows/copilot-auto-handoff.yml)

## Archived material

Legacy/unused docs live under `.github/_unused/`.
They are **not active policy** unless explicitly revived.

