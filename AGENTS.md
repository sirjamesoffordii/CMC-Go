# CMC Go — Agent Operating Manual

This is the **single source of truth** for how agents operate in this repo, and what the Tech Lead does (label/approve/merge) in a hands-off workflow.

## Agents

Agents use these accounts for all GitHub activity (Issues, PRs, comments). This is how you identify which agent did what.

| Agent                 | GitHub Account            | Default Model    | Responsibility                             |
| --------------------- | ------------------------- | ---------------- | ------------------------------------------ |
| **Tech Lead**         | `Alpha-Tech-Lead`         | Claude Opus 4.5  | Coordination, board management, delegation |
| **Software Engineer** | `Software-Engineer-Agent` | GPT-5.2-Codex    | Implementation, verification               |
| **Cloud Agent**       | `copilot-swe-agent[bot]`  | (GitHub default) | Simple issues (score 0-2) only             |
| **SWE Opus**          | `Software-Engineer-Agent` | Claude Opus 4.5  | Complex implementation (score 5-6)         |

## Read-first

- **CMC Go Project (command center):** https://github.com/users/sirjamesoffordii/projects/4
- `.github` index: [.github/README.md](.github/README.md)
- Tech Lead role: [.github/agents/tech-lead.agent.md](.github/agents/tech-lead.agent.md)
- Software Engineer role: [.github/agents/software-engineer.agent.md](.github/agents/software-engineer.agent.md)

## Activation checklist (once per session)

- **CMC Go Project:** https://github.com/users/sirjamesoffordii/projects/4 (read README for product context)
- `AGENTS.md` (this file)
- `.github/copilot-instructions.md`
- Your role doc:
  - Tech Lead: `.github/agents/tech-lead.agent.md`
  - Software Engineer: `.github/agents/software-engineer.agent.md`
- `.github/prompts/loop.prompt.md`

## Operating principles

- **CMC Go Project is the authoritative truth.** The project board (https://github.com/users/sirjamesoffordii/projects/4) tracks what happened, what's happening, and what's next. Tech Lead keeps it current.
- **Issues/PRs are the task bus.** Decisions + evidence live there, but STATUS lives in the Project.
- **Tech Lead coordinates, Software Engineer implements.** Tech Lead never gets locked into complex implementation — always delegate to Software Engineer to keep the project moving.
- **Execution mode must be explicit.** Local agents use worktrees; cloud agents are branch-only.
- **Prefer small diffs.** Optimize for reviewability, but don't block forward progress; split into multiple PRs only when it materially reduces risk.
- **No secrets in chat/code.** `.env*` stays local; use platform/GitHub secrets. For secret handling, see `CMC_GO_PATTERNS.md` → "Secrets & Tokens".
- **Assume the user is not in the loop.** Only request user input when absolutely required; otherwise coordinate via Tech Lead + Project/Issues.
- **Keep looping.** Take the next best safe step until Done.
- **Reflection is mandatory.** Every task ends with two checks: Workflow Improvement + Pattern Learning. See "End-of-Task Reflection".

## CMC Go Project workflow (critical)

The **CMC Go Project** is the authoritative truth: https://github.com/users/sirjamesoffordii/projects/4

It tracks:

- **What happened** — Done items with linked PRs and evidence
- **What's happening** — In Progress items with assignees
- **What's next** — Todo items prioritized by Phase
- **What's blocked** — Blocked items with pending decisions

### Status field meanings

| Status          | Meaning                                 |
| --------------- | --------------------------------------- |
| **Todo**        | Ready to start, not claimed             |
| **In Progress** | Someone is actively working             |
| **Blocked**     | Waiting on external input/decision      |
| **Verify**      | Implementation done, needs verification |
| **Done**        | Verified and merged                     |

### Agent responsibilities (non-negotiable)

The board must always reflect reality. Update it immediately, not at end of session.

1. **Before starting work:** Set Status → In Progress, assign yourself
2. **When blocked:** Set Status → Blocked, post A/B/C decision in Issue
3. **When implementation done:** Set Status → Verify, open PR
4. **After merge:** Set Status → Done

**If you skip this, Tech Lead doesn't know what's happening.**

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

- **Default to action.** Don't ask the user for permission to proceed with routine steps; keep Tech Lead informed via Projects v2 + Issue comments.
- **Auto-accept routine choices.** Create worktrees/branches, install deps, run checks/tests, and retry transient failures once.
- **Polling is OK.** If waiting for CI/deploys/logs, poll/stream for up to ~2 minutes without asking (and keep going with parallel work).
- **Tooling is implicit.** Agents may use any tools available in their environment (VS Code tasks/terminal/CI/GitHub); don’t enumerate tool lists in docs.
- **Only stop for critical decisions.** Escalate only when the choice is security-sensitive, destructive/irreversible, or changes repo invariants/contracts.
- **Token discipline.** Keep messages short; post durable status/evidence to the Issue/PR; prefer links and deltas over log dumps.

## Knowledge surfaces (when to consult what)

- **Policy + workflow:** `AGENTS.md` (this file)
- **Product + status:** CMC Go Project — https://github.com/users/sirjamesoffordii/projects/4
- **Curated learnings (pitfalls/patterns):** `.github/agents/CMC_GO_PATTERNS.md`
- **Operational procedures (as-needed):** `.github/_unused/docs/agents/operational-procedures/OPERATIONAL_PROCEDURES_INDEX.md`

## Execution modes (critical)

Agents may run in one of two execution modes. All instructions below apply, but the repo hygiene mechanics differ.

### Mode A — Local VS Code agent (runs on a human-operated machine)

- **Worktrees are required** — except for low-risk work (see "Low-risk fast path" below).
- Use worktrees to isolate implementation and verification.
- Only `wt-main` is allowed to run `pnpm dev`.
- **Low-risk exception:** For docs-only or trivial fixes (≤50 LOC, 1–2 files, no schema/auth/env), you may work directly on `staging`.

### Mode B — GitHub-hosted Copilot coding agent (cloud)

- **Worktrees do not exist.** Operate branch-only.
- Always base work on `staging` and open PRs targeting `staging`.
- Do not run long-lived servers.

## Tech Lead role (coordination-first)

Tech Lead's **#1 priority is keeping the project on track** — not implementing complex features.

- Creates Issues using templates.
- Scores complexity and delegates to appropriate Software Engineer (local or cloud).
- Applies labels to route work (e.g. `agent:copilot-swe`, `verify:v1`).
- Approves/merges PRs when the verification gate passes.
- Manages workload (max 4 active items per Tech Lead instance).
- Performs console-only steps when 2FA/login blocks automation (Sentry/Railway/etc.).

**Never get locked into complex implementation.** If a task would take Tech Lead away from coordination for extended time, delegate it to Software Engineer with Opus 4.5.

## Workload Management

Tech Lead manages concurrent work to prevent review backlog. The **Project board is the source of truth** — no separate tracking needed.

### Capacity limit

| Limit                              | Value | Rationale                       |
| ---------------------------------- | ----- | ------------------------------- |
| **Max active items per Tech Lead** | 4     | TL review/coordination capacity |

**Active items** = Issues with Status "In Progress" OR "Verify" (includes both local Software Engineer and Cloud Agent work).

### How to check capacity

Before delegating new work:

```
Count: Issues where Status = "In Progress" OR "Verify"
If count >= 4 → spawn secondary Tech Lead OR wait for completion
If count < 4 → delegate new work
```

### Handling stale/interrupted work

**Time-based stale detection (complexity × 3 minutes):**

| Complexity Score | Expected Max Time | If Exceeded |
| ---------------- | ----------------- | ----------- |
| 1                | 3 min             | Investigate |
| 2                | 6 min             | Investigate |
| 3                | 9 min             | Investigate |
| 4                | 12 min            | Investigate |
| 5                | 15 min            | Investigate |
| 6                | 18 min            | Investigate |

**When an agent exceeds expected time:**

1. Check if agent is still producing output (for local agents)
2. Check Issue comments for recent activity
3. Check if PR exists and has recent commits
4. For cloud agents: Check if bot is still assigned

**Recovery actions:**

- **Still working:** Let it continue
- **Silent (no activity):** Re-assign to new agent
- **Stuck on question:** Answer and re-delegate
- **Session died:** Mark as Blocked or move back to Todo

**On session start:** Tech Lead scans board for stale items (In Progress > expected time based on complexity) and recovers them.

### Scaling with multiple Tech Leads

When workload exceeds 4 active items:

1. Tech Lead spawns a **secondary Tech Lead** via `runSubagent`
2. Secondary Tech Lead gets its own capacity of 4 items
3. Primary Tech Lead retains coordination oversight

**Secondary Tech Lead spawn template:**

```
Prompt: You are a secondary Tech Lead instance. Primary has delegated these Issues to you:
- Issue #X: [title]
- Issue #Y: [title]

You have capacity for 4 active items. Coordinate these issues to completion and report back when done.
Do not create new Issues — only implement what's assigned.
```

## Model Selection

**Model is set by agent variant.** You cannot override at runtime — choose the agent name to select the model.

Score issues to select the right agent:

| Factor    | 0 (Low)        | 1 (Med)       | 2 (High)                  |
| --------- | -------------- | ------------- | ------------------------- |
| Risk      | Docs, comments | Logic, tests  | Schema, auth, env         |
| Scope     | 1 file         | 2–5 files     | 6+ files or cross-cutting |
| Ambiguity | Clear spec     | Some unknowns | Needs design/research     |

**Total Score → Agent Selection:**

| Score | Agent Name              | Model            | Token Cost    |
| ----- | ----------------------- | ---------------- | ------------- |
| 0-2   | Cloud Agent             | (GitHub default) | Dedicated SKU |
| 3-4   | Software Engineer (SWE) | GPT-5.2-Codex    | 1×            |
| 5-6   | SWE Opus                | Claude Opus 4.5  | 3×            |

**Role defaults:**

- **Tech Lead:** Claude Opus 4.5 (coordination requires judgment)
- **Software Engineer:** GPT-5.2-Codex (score 3-4)
- **SWE Opus:** Claude Opus 4.5 (score 5-6)
- **Cloud Agent:** GitHub default (simple issues only)

**Agent name must be exact.** Use `"Software Engineer (SWE)"` or `"SWE Opus"` — partial names fall back to default model.

## Standard workflow

1. Tech Lead makes the work executable (Goal/Scope/AC + verification checklist)
2. Tech Lead scores complexity and selects agent:
   - Score 0-2: Cloud Agent (label `agent:copilot-swe` or `copilot-coding-agent` tool)
   - Score 3-4: `runSubagent("Software Engineer (SWE)")` — GPT-5.2-Codex
   - Score 5-6: `runSubagent("SWE Opus")` — Claude Opus 4.5
3. Software Engineer implements or verifies (smallest diff + evidence, or checklist + verdict)
4. "Done" requires evidence (commands/results + links)
5. Update Projects v2 as you go (board reflects reality)

## Agent Spawning Behavior (tested)

These behaviors were empirically verified:

### Premium requests

**Spawning subagents does NOT consume premium requests.** Premium request % only increases when the main session user sends a message. You can safely spawn as many premium subagents (Tech Lead, SWE Opus) as needed without burning premium quota.

### Spawning hierarchy

```
PRIMARY TL (has runSubagent tool)
├── Can spawn local SWE ✅
├── Can spawn local TL ✅
├── Can spawn cloud agents ✅
│
└── SPAWNED agents (no runSubagent tool)
    ├── Cannot spawn local agents ❌
    └── CAN spawn cloud agents ✅
```

Only the **primary agent session** has access to `runSubagent`. Spawned agents can only delegate via cloud agents.

### Parallel spawning

TL can spawn **multiple agents in parallel** in a single call:

```
runSubagent([SWE-1, SWE-2, SWE-3, SWE-4])  // All run in parallel
```

TL is blocked until all return, but they execute concurrently. No hard limit found (tested up to 6).

### Context inheritance

Spawned agents inherit workspace context (repo name, branch, project structure). They can answer questions about the codebase without reading files first.

## Solo mode (one agent can run the whole system)

When only one agent/person is active, run the full loop end-to-end:

- Do Tech Lead work first: make the Issue executable (Goal/Scope/AC/Verification) and set the correct Project status.
- Then do Software Engineer work: implement the smallest diff, run the cheapest relevant checks, and post evidence.
- Finish by updating the Issue/PR thread + Projects v2 so the repo reflects reality.

## Roles (active)

- **Tech Lead** runs first (triage/coherence/deconflict): see [.github/agents/tech-lead.agent.md](.github/agents/tech-lead.agent.md)
- **Software Engineer** runs second (implement + evidence, or verify): see [.github/agents/software-engineer.agent.md](.github/agents/software-engineer.agent.md)
- **Cloud Agent** handles simple issues (score 0-2) via `agent:copilot-swe` label

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
- Leave a short Issue comment: `CLAIMED by <Tech Lead|Software Engineer> — <worktree>/<branch> — ETA <time>`

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
- Security-sensitive or destructive/irreversible choices
- Changes to repo invariants/contracts

## Human input required (secrets/tokens/auth)

When an agent needs a human to provide a value (secret, token, auth code):

1. **Don't ask in chat** — secrets in chat are compromised
2. **Run a hidden terminal prompt** — human just pastes
3. **Use immediately, then clear** — don't persist in env

Assume the user is not available by default. If human input is required, set Projects v2 → **Blocked** and post the prompt command + what you need in the Issue so the TL can coordinate the handoff.

See `CMC_GO_PATTERNS.md` → "Secrets & Tokens" for the exact commands.

Common triggers:

- `gh auth login` needed
- Railway/Sentry CLI not authenticated
- API key required for external service
- 2FA code needed

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
- **End-of-Task Reflection:** (required section, see below)

## End-of-Task Reflection (mandatory)

**Every task ends with two checks. Both are required, even if no changes are made.**

### Pre-check (before recommending changes)

Before making any recommendation, review current state of:

- `AGENTS.md`
- `.github/copilot-instructions.md`
- Your active role file (`.github/agents/*.agent.md`)
- `.github/agents/CMC_GO_PATTERNS.md`

Purpose: avoid duplication, avoid contradictions, ensure alignment with current system intent.

### Evaluation questions

**Workflow Improvement Check — ask yourself:**

- Did the current workflow slow execution?
- Did agents hesitate, duplicate work, or require clarification?
- Did board state or routing create friction?
- Was there unnecessary back-and-forth or ambiguity?

**Pattern Learning Check — ask yourself:**

- Did this task reveal a new recurring pattern?
- Did it expose an anti-pattern or failure mode?
- Did it refine or contradict an existing pattern?
- Would another agent benefit from knowing this?

### Required output format

Every PR (or final task report) MUST include:

```markdown
## End-of-Task Reflection (Required)

### Workflow Improvement Check

- Recommendation: Changes recommended / No changes recommended
- Rationale: (brief)
- If changes recommended: files edited + summary + tradeoffs/risks

### Pattern Learning Check

- Recommendation: Changes recommended / No changes recommended
- Rationale: (brief)
- If changes recommended: files edited + summary + tradeoffs/risks
```

### When "Changes recommended"

1. **Implement the changes** — actual file edits, not just suggestions
2. **Changes may be large** — additions, removals, or rewrites are all valid
3. **Ensure coherence** — no contradictions across: AGENTS.md, copilot-instructions.md, role files, CMC_GO_PATTERNS.md
4. **Explain briefly:**
   - What you experienced
   - Why the current approach was suboptimal
   - Why the proposed change improves future execution
   - Tradeoffs / risks

### Authority

- No files are untouchable — agents may edit AGENTS.md, copilot-instructions.md, role files, and patterns directly
- Tech Lead (TL) remains the final arbiter through PR approval/rejection
- Priority is coherence, clarity, and long-term system effectiveness

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

## Automation: Cloud Agent auto-handoff

Label an Issue with `agent:copilot-swe` to trigger cloud execution:

- [.github/workflows/copilot-auto-handoff.yml](.github/workflows/copilot-auto-handoff.yml)

Required secrets (repo Settings → Secrets and variables → Actions):

- `COPILOT_ASSIGN_TOKEN_PRO` — Pro+ account token for cloud agent API access

Notes:

- Cloud agents are for **simple issues only** (complexity score 0-2)
- The workflow requests Copilot to work from `staging` and open a PR targeting `staging`
- Tech Lead is notified when cloud agent opens a PR (via `copilot-completion-notify.yml`)
- GitHub evaluates `issues.*` workflows from the repository's default branch (`staging`)

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
2. Or ask TL/human to run command: `workbench.action.terminal.killAll`
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
2. Ask TL/human to run: `gh auth login`

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
