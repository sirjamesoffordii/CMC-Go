# CMC Go — Agent Operating Manual

This is the **single source of truth** for how agents operate in this repo, and what the operator does (label/approve/merge) in a hands-off workflow.

## Read-first

- Product snapshot: [.github/agents/CMC_GO_BRIEF.md](.github/agents/CMC_GO_BRIEF.md)
- `.github` index: [.github/README.md](.github/README.md)
- TL role: [.github/agents/tech-lead.agent.md](.github/agents/tech-lead.agent.md)
- SWE role: [.github/agents/software-engineer.agent.md](.github/agents/software-engineer.agent.md)

Working truth (Projects v2): https://github.com/users/sirjamesoffordii/projects/2

## Activation checklist (once per session)

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.github/README.md`
- `.github/agents/CMC_GO_BRIEF.md`
- Your role doc (`.github/agents/tech-lead.agent.md` or `.github/agents/software-engineer.agent.md`)
- `.github/prompts/loop.prompt.md`

## Operating principles

- **Projects v2 is the command center.** All work flows through the project board. The operator sees status there.
- **Issues/PRs are the task bus.** Decisions + evidence live there, but STATUS lives in Projects.
- **Execution mode must be explicit.** Local agents use worktrees; GitHub-hosted agents are branch-only.
- **Prefer small diffs.** Optimize for reviewability, but don’t block forward progress; split into multiple PRs only when it materially reduces risk.
- **No secrets in chat/code.** `.env*` stays local; use platform/GitHub secrets. For secret handling, see `CMC_GO_PATTERNS.md` → "Secrets & Tokens".
- **Keep looping.** Take the next best safe step until Done.

## Projects v2 workflow (critical)

The project board is how the operator knows what's happening: https://github.com/users/sirjamesoffordii/projects/2

### Status field meanings

| Status          | Meaning                                 |
| --------------- | --------------------------------------- |
| **Todo**        | Ready to start, not claimed             |
| **In Progress** | Someone is actively working             |
| **Blocked**     | Waiting on external input/decision      |
| **Verify**      | Implementation done, needs verification |
| **Done**        | Verified and merged                     |

### Agent responsibilities

1. **Before starting work:** Set Status → In Progress, assign yourself
2. **When blocked:** Set Status → Blocked, post A/B/C decision in Issue
3. **When implementation done:** Set Status → Verify, open PR
4. **After merge:** Set Status → Done

### Project fields to set

- **Status** — always keep current
- **Assignees** — who's working on it
- **Phase** — which milestone (Phase 1, 1.2, 2, 3, 4)
- **Workstream** — area (Map, Panel, Server, etc.)
- **Verify Level** — L0/L1/L2
- **Item Type** — Epic, Task, Verification, PR

### Commands to update project status

```bash
# Add issue to project
gh project item-add 2 --owner sirjamesoffordii --url <issue-url>

# Update status (use field ID from gh project field-list)
gh project item-edit --project-id PVT_kwHODqX6Qs4BNFTD --id <item-id> --field-id PVTSSF_lAHODqX6Qs4BNFTDzg8LjhE --single-select-option-id <status-option-id>
```

Status option IDs: Todo=`689f8a74`, In Progress=`64fc3c51`, Blocked=`e3f651bf`, Verify=`4b4ae83d`, Done=`4d7d0ccb`

## Speed-first defaults (default)

This repo is designed for **hands-off, continuous agent execution**.

- **Default to action.** Don’t ask the operator for permission to proceed with routine steps.
- **Auto-accept routine choices.** Create worktrees/branches, install deps, run checks/tests, and retry transient failures once.
- **Polling is OK.** If waiting for CI/deploys/logs, poll/stream for up to ~2 minutes without asking (and keep going with parallel work).
- **Tooling is implicit.** Agents may use any tools available in their environment (VS Code tasks/terminal/CI/GitHub); don’t enumerate tool lists in docs.
- **Only stop for critical decisions.** Escalate only when the choice is security-sensitive, destructive/irreversible, or changes repo invariants/contracts.
- **Token discipline.** Keep messages short; post durable status/evidence to the Issue/PR; prefer links and deltas over log dumps.

## Knowledge surfaces (when to consult what)

- **Policy + workflow:** `AGENTS.md` (this file)
- **Product snapshot:** `.github/agents/CMC_GO_BRIEF.md`
- **Curated learnings (pitfalls/patterns):** `.github/agents/CMC_GO_PATTERNS.md`
- **Operational procedures (as-needed):** `.github/_unused/docs/agents/operational-procedures/OPERATIONAL_PROCEDURES_INDEX.md`

## Execution modes (critical)

Agents may run in one of two execution modes. All instructions below apply, but the repo hygiene mechanics differ.

### Mode A — Local VS Code agent (runs on the operator machine)

- **Worktrees are required.** Never work directly on `staging`.
- Use worktrees to isolate implementation and verification.
- Only `wt-main` is allowed to run `pnpm dev`.

### Mode B — GitHub-hosted Copilot coding agent (cloud)

- **Worktrees do not exist.** Operate branch-only.
- Always base work on `staging` and open PRs targeting `staging`.
- Do not run long-lived servers.

## Operator role (hands-off)

The operator is not expected to write code.

- Creates Issues using templates.
- Applies labels to route work (e.g. `agent:copilot-swe`, `verify:v1`).
- Approves/merges PRs when the verification gate passes.
- Performs console-only steps when 2FA/login blocks automation (Sentry/Railway/etc.).

## Standard workflow

1. TL makes the work executable (Goal/Scope/AC + verification checklist)
2. SWE implements or verifies (smallest diff + evidence, or checklist + verdict)
3. “Done” requires evidence (commands/results + links)
4. Update Projects v2 as you go (board reflects reality)

## Solo mode (one agent can run the whole system)

When only one agent/person is active, run the full loop end-to-end:

- Do TL work first: make the Issue executable (Goal/Scope/AC/Verification) and set the correct Project status.
- Then do SWE work: implement the smallest diff, run the cheapest relevant checks, and post evidence.
- Finish by updating the Issue/PR thread + Projects v2 so the repo reflects reality.

## Roles (active)

- **Tech Lead (TL)** runs first (triage/coherence/deconflict): see [.github/agents/tech-lead.agent.md](.github/agents/tech-lead.agent.md)
- **Software Engineer (SWE)** runs second (implement + evidence, or verify): see [.github/agents/software-engineer.agent.md](.github/agents/software-engineer.agent.md)

## Worktree policy

Work happens in isolated worktrees to prevent collisions.

- `wt-main` — only place allowed to run `pnpm dev`
- `wt-impl-<issue#>-<slug>` — implementation work
- `wt-verify-<pr#>-<slug>` — verification work (no implementation)
- `wt-docs-<YYYY-MM-DD>` — docs-only changes

Note: this policy applies to **Mode A (local)** only. In **Mode B (cloud)** the equivalent is simply “one branch per task; never commit on `staging`.”

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
- **Learning (optional):** one reusable takeaway to avoid repeating work
- **Notes/Risks:** anything a reviewer should know

## Escalation comment (copy/paste)

When blocked, post **one** decision request (A/B/C) and keep moving.

**Do NOT escalate for these — self-recover:**

- Terminal/pager issues → use `Agent: Recover terminal` task
- Stuck rebase → use `Git: Rebase abort` task
- Dirty working tree → use `Git: Hard reset to staging` task
- Routine waits/timeouts (CI, network) → retry once, poll briefly, continue parallel work

**DO escalate for these:**

- All recovery tasks fail
- Operator login required (gh auth, Railway, Sentry)
- Security-sensitive or destructive/irreversible choices
- Changes to repo invariants/contracts

Escalation template:

- **Status:** Blocked
- **Decision needed:** <one sentence>
- **Why it matters:** <one sentence>
- **Options:** A) … / B) … / C) …
- **Recommended default (if no response by <time>):** <A/B/C>
- **Evidence:** <links / 3–10 key lines>
- **Parallel work I will do now:** <short list>

## PR description (minimum)

- **Why:** link to Issue
- **What changed:** bullets
- **How verified:** commands + results
- **Risk:** low/med/high + why

## Verification verdict (minimum)

When verifying a PR, post:

- **Result:** Pass / Pass-with-notes / Fail
- **Evidence:** commands + key output
- **Notes/Risks:** gaps, flakiness, edge cases

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

Required secrets (repo Settings → Secrets and variables → Actions):

- `COPILOT_ASSIGN_TOKEN_TL` — used for `agent:copilot` and `agent:copilot-tl`
- `COPILOT_ASSIGN_TOKEN_SWE` — used for `agent:copilot-swe`

Notes:

- The workflow requests Copilot to work from `staging` (`agent_assignment.base_branch = staging`) and open a PR targeting `staging`.
- GitHub evaluates `issues.*` workflows from the repository's default branch. This repo's default branch is `staging`; if that ever changes, ensure this workflow exists on the new default branch or the label trigger will not fire.

## Operational procedures (when needed)

Operational procedures are archived (not active policy), but are useful reference for ops/CI/tooling:

- `.github/_unused/docs/agents/operational-procedures/OPERATIONAL_PROCEDURES_INDEX.md`

## Archived material

Legacy/unused docs live under `.github/_unused/`.
They are **not active policy** unless explicitly revived.

## Agent Troubleshooting & Escape Hatches

When standard tools fail, use these fallbacks:

### Terminal stuck / "alternate buffer" hang

**Symptoms:** `run_in_terminal` returns "The command opened the alternate buffer" repeatedly.

**Fix:**

1. Run VS Code task: `Agent: Recover terminal`
2. Or ask operator to run command: `workbench.action.terminal.killAll`
3. Then run: `Agent: Health check` to verify recovery

### tasks.json corrupted

**Symptoms:** Tasks won't run, JSON parse errors.

**Fix:**

```bash
git checkout -- .vscode/tasks.json
```

### Git rebase stuck in editor

**Symptoms:** Rebase hangs waiting for editor input.

**Fix:**

1. Run task: `Git: Rebase abort`
2. Or: `git -c core.editor=true rebase --abort`

### GitHub CLI auth issues

**Symptoms:** `gh` commands fail with auth errors.

**Fix:**

1. Run: `gh auth status` to diagnose
2. Ask operator to run: `gh auth login`

### Health check (run at session start)

Run VS Code task: `Agent: Health check`

This verifies:

- Terminal output works
- Git is functional
- GitHub CLI is authenticated
- Node/pnpm versions
- Repo state (branch, clean/dirty)

### Available agent-safe tasks

| Task                         | Purpose                           |
| ---------------------------- | --------------------------------- |
| `Agent: Health check`        | Verify all systems working        |
| `Agent: Recover terminal`    | Reset pager environment           |
| `Git: Status`                | Safe status check                 |
| `Git: Hard reset to staging` | Nuclear option: discard all local |
| `Git: Rebase abort`          | Escape stuck rebase               |
| `GH: PR status (by number)`  | Check PR mergeability             |
| `GH: Checkout PR (clean)`    | Safely checkout a PR              |
| `GH: Merge PR (squash)`      | Merge and delete branch           |
