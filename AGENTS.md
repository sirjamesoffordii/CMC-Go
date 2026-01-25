# CMC Go — Agent Operating Manual

This is the **single source of truth** for how agents operate in this repo, and what the Tech Lead does (label/approve/merge) in a hands-off workflow.

## Quick Start (30 seconds to working)

**Run these immediately at session start:**

```powershell
# 1. Verify environment (run VS Code task)
#    Task: "Agent: Health check"

# 2. Check board state
gh project item-list 4 --owner sirjamesoffordii --limit 10 --format json | ConvertFrom-Json | Select-Object -ExpandProperty items | Format-Table number, title, status

# 3. Find your work
#    - If Status = "In Progress" assigned to you → continue it
#    - If Status = "Todo" → pick highest priority, set to In Progress
#    - If board empty → see "Cold Start" section below
```

**Then execute your role:**

- **Tech Lead:** Coordinate → delegate → poll board
- **Software Engineer:** EXPLORE → IMPLEMENT → VERIFY → reflect

**That's it. Start working.**

---

## Premium Request Quotas (how billing works)

**GitHub Copilot Pro includes 1,500 premium requests/month.** Each model has a different "weight":

| Model           | Approximate Cost | Use Case                       |
| --------------- | ---------------- | ------------------------------ |
| GPT 4.1         | 0× (included)    | Trivial tasks, no premium cost |
| GPT-5.2-Codex   | 1×               | Code implementation            |
| GPT-5.2         | 1×               | General reasoning              |
| Claude Opus 4.5 | 3×               | Complex thinking, coordination |
| Cloud Agent     | Dedicated SKU    | Async work (separate quota)    |

**Where to check usage:**

- **Authoritative:** https://github.com/settings/billing → Premium request analytics
- **VS Code sidebar:** May show cached/session-specific values (less reliable)

**Subagents DO consume premium requests.** Each `runSubagent` call uses the selected model's quota. Choose models wisely.

## Agents

Two agent roles, both using Claude Opus 4.5 for continuous autonomous work:

| Agent                       | GitHub Account            | Model            | Token Cost | Responsibility                             |
| --------------------------- | ------------------------- | ---------------- | ---------- | ------------------------------------------ |
| **Tech Lead (TL)**          | `Alpha-Tech-Lead`         | Claude Opus 4.5  | 3×         | Coordination, board management, delegation |
| **Software Engineer (SWE)** | `Software-Engineer-Agent` | Claude Opus 4.5  | 3×         | Implementation, verification, continuous   |
| **Cloud Agent**             | `copilot-swe-agent[bot]`  | (GitHub default) | Dedicated  | Simple async issues (fire-and-forget)      |
| **Human (Sir James)**       | `sirjamesoffordii`        | —                | —          | Oversight, decisions, Plus account owner   |

### Identity Separation (critical)

**Every actor has a distinct GitHub account.** This makes it easy to audit who did what:

- `sirjamesoffordii` = Human (Sir James) — oversight, critical decisions, Plus account features
- `Alpha-Tech-Lead` = TL agent — coordination, delegation, board management
- `Software-Engineer-Agent` = SWE agent — implementation, PRs, commits

**Agents MUST authenticate as their designated account before any GitHub operations:**

```powershell
# TL authenticates (set at start of EVERY terminal session)
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-alpha-tech-lead"
gh auth status  # Should show: Alpha-Tech-Lead

# SWE authenticates (set at start of EVERY terminal session)
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-software-engineer-agent"
gh auth status  # Should show: Software-Engineer-Agent

# Human (default, no env var needed)
$env:GH_CONFIG_DIR = $null
gh auth status  # Should show: sirjamesoffordii
```

**IMPORTANT:** The `GH_CONFIG_DIR` environment variable must be set in EACH new terminal. If you open a new terminal mid-session, set it again before running `gh` commands.

### Cloud Agent Access

**Only `sirjamesoffordii` (Plus account) can directly spawn cloud agents** via `gh agent-task create` or the `copilot-coding-agent` tool.

**TL can still trigger cloud agents indirectly** by applying the `agent:copilot-swe` label to issues — this triggers a GitHub workflow that uses the Plus account token.

In practice, we rarely need cloud agents now that local SWE with Opus 4.5 works well for continuous work.

**Spawning agents:**
```powershell
code chat -m "Tech Lead (TL)" "Start"           # Spawn TL
code chat -m "Software Engineer (SWE)" "Start"  # Spawn SWE
```

## Session Start (once per session)

**Read in this order (token-efficient):**

1. `AGENTS.md` (this file) — workflow + constraints
2. Your role file: `.github/agents/tech-lead.agent.md` or `.github/agents/software-engineer.agent.md`
3. **CMC Go Project:** https://github.com/users/sirjamesoffordii/projects/4 (check board state)
4. `.github/prompts/loop.prompt.md` (loop behavior)
5. `.github/agents/reference/CMC_GO_PATTERNS.md` (only if you hit a known pitfall)

**Target ~400 lines read max before starting work.** Don't read everything.

Ops/CI/tooling reference (as-needed):

- `.github/_unused/docs/agents/operational-procedures/OPERATIONAL_PROCEDURES_INDEX.md`

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

## Cold Start (Empty Board)

If the CMC Go Project board has **zero items** (or you're starting fresh):

### Concrete Steps

```bash
# 1. Find TODOs and FIXMEs
grep -rn "TODO\|FIXME" --include="*.ts" --include="*.tsx" | head -50

# 2. Check TypeScript errors
pnpm check

# 3. Check test failures
pnpm test

# 4. Check recent CI failures
gh run list --limit 5 --status failure

# 5. Check for stale PRs
gh pr list --state open
```

### Then:

1. For each finding, create an Issue with Goal/Scope/AC
2. Add Issues to Project 4: `gh project item-add 4 --owner sirjamesoffordii --url <issue-url>`
3. Report to operator: "Board was empty. Created N issues from scan."

**Never wait indefinitely for work.** If truly nothing to do, post: "Board empty, codebase healthy, awaiting operator direction."

## Circuit Breaker (mandatory)

**Prevents infinite loops and wasted effort.**

### What counts as a failure?

- Command exits with non-zero code
- Test suite has any failing tests
- `pnpm check` reports TypeScript errors
- Same error occurs 3 times in a row

**NOT failures (retry once):**

- Network timeout
- Terminal pager issue (use `Agent: Recover terminal` task)

### Task-level circuit breaker

After **3 consecutive failures** on the same task:

1. Set status → **Blocked**
2. Post failure summary with all evidence
3. Move to next item (do not retry indefinitely)

### Session-level circuit breaker

After **10 total failures** in one session:

1. Post session summary with all failures
2. Stop and await operator review

**Never loop infinitely on a broken path.**

## Default Decisions

Use these defaults to reduce blocking and keep momentum. Post A/B/C only when the "Override when" condition applies.

| Situation                        | Default                   | Override when         |
| -------------------------------- | ------------------------- | --------------------- |
| Retry vs rollback on failure     | Retry once                | Same error 3x         |
| Local vs cloud agent (score 2-3) | Local SWE                 | Queue > 4 items       |
| Fix lint warning vs ignore       | Ignore if <10 LOC impact  | Breaks build          |
| Create worktree vs direct edit   | Direct if docs-only       | Any code change       |
| Escalate vs decide               | Decide with A/B/C comment | Security/irreversible |

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
# Add issue to project (Project 4 = CMC Go v1.0 Roadmap)
gh project item-add 4 --owner sirjamesoffordii --url <issue-url>

# Update status (use field ID from gh project field-list)
gh project item-edit --project-id PVT_kwHODqX6Qs4BNUfu --id <item-id> --field-id PVTSSF_lAHODqX6Qs4BNUfuzg8WaYA --single-select-option-id <status-option-id>
```

Status option IDs: Todo=`f75ad846`, In Progress=`47fc9ee4`, Verify=`5351d827`, Done=`98236657`, Blocked=`652442a1`

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
- **Curated learnings (pitfalls/patterns):** `.github/agents/reference/CMC_GO_PATTERNS.md`
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

**Active items** = Issues with Status "In Progress" OR "Verify". This includes:

- Cloud Agent work (Issues delegated via `agent:copilot-swe` label or `gh agent-task create`)
- Local delegated sessions (via `code chat -m "Software Engineer (SWE)"`)

**NOT counted:** Subagents via `runSubagent` — these are internal/blocking and don't require polling.

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

**Both TL and SWE use Claude Opus 4.5.** This is intentional — both need judgment for continuous autonomous work.

### Why Opus 4.5 for both agents

| Agent | Why Opus 4.5                                                            |
| ----- | ----------------------------------------------------------------------- |
| TL    | Coordination requires judgment — deciding what to delegate, when to poll |
| SWE   | Continuous work requires judgment — looping, claiming issues, deciding   |

**Cost efficiency:** The 3× token cost is efficient because one agent session handles many issues. You're paying for judgment, not per-task overhead.

### Complexity Scoring (for task routing)

Score tasks before deciding how to route them:

| Factor        | 0 (Low)        | 1 (Med)       | 2 (High)                  |
| ------------- | -------------- | ------------- | ------------------------- |
| **Risk**      | Docs, comments | Logic, tests  | Schema, auth, env         |
| **Scope**     | 1 file         | 2–5 files     | 6+ files or cross-cutting |
| **Ambiguity** | Clear spec     | Some unknowns | Needs design/research     |

### Score → Routing Decision

| Score | Route To                            | Why                                          |
| ----- | ----------------------------------- | -------------------------------------------- |
| 0-2   | Cloud Agent (`agent:copilot-swe`)   | Simple async, TL continues working           |
| 2-6   | SWE (`code chat -m "Software..."`)  | Needs judgment, continuous work              |

**Simple rule:** Cloud agents for fire-and-forget. Local SWE for anything that needs judgment or continuous work.

### Subagent Model Selection

When TL or SWE spawns subagents via `runSubagent`, they inherit the caller's model (Opus 4.5).

**Subagent use cases:**

| Caller | Subagent Purpose                         |
| ------ | ---------------------------------------- |
| TL     | Research before delegating, verification |
| SWE    | Parallel research, non-blocking tests    |

**Cost note:** Subagents use 3× tokens (Opus). Use them for parallelization and non-blocking work, not trivial lookups.

### Role Requirements

| Role   | Model           | Spawned Via                          |
| ------ | --------------- | ------------------------------------ |
| **TL** | Claude Opus 4.5 | `code chat -m "Tech Lead (TL)"`      |
| **SWE**| Claude Opus 4.5 | `code chat -m "Software Engineer (SWE)"` |

**Agent name must be exact.** Partial names fall back to default (which may be TL).

## Subagents vs Delegated Sessions (critical distinction)

There are two fundamentally different ways to get help from other agents:

### Subagents (`runSubagent`) — Internal Help

**What:** Spawn a helper that reports back directly to you.

- **Blocking** — you wait for the result
- **Internal** — result comes back in the same session
- **Uses quota** — subagents inherit caller's model (Opus 4.5 = 3× tokens)
- **Unlimited count** — spawn as many as needed (tested: 6+ in parallel)
- **Full powers** — subagents can do REAL WORK (edit files, run commands, commit, push)
- **Best for:** Parallel research, non-blocking verification, implementation with tight coordination

**Cost note:** All subagents use Opus 4.5 (3× tokens). Use them for parallelization and non-blocking work, not trivial lookups that you could do yourself.

**Subagents do REAL WORK, not just research:**

- ✅ Edit and create files
- ✅ Run terminal commands
- ✅ Commit and push to git
- ✅ Create PRs and Issues
- ❌ Cannot spawn their own subagents (but CAN spawn cloud agents)

**When to use subagents:**

| Agent | Subagent Use Cases                                               |
| ----- | ---------------------------------------------------------------- |
| TL    | Research before delegating, verification, design synthesis       |
| SWE   | Parallel file analysis, non-blocking tests, quick lookups        |

**SWE should use subagents more than TL.** SWE is doing implementation work where parallelization helps. TL mostly delegates full tasks via `code chat`.

### Subagent Execution Model (critical to understand)

**Parallel batches are all-or-nothing:**

```
TL sends: [Agent1, Agent2, Agent3]  // All start in parallel
         ↓
TL is BLOCKED waiting for ALL THREE
         ↓
Agent1 finishes → result held
Agent2 finishes → result held
Agent3 finishes → result held
         ↓
ALL results return to TL at once
         ↓
NOW TL can send another batch
```

**You cannot peel off partial results.** But after a batch completes, TL can immediately send another batch without user intervention.

**TL can loop autonomously:**

```
TL Session (no user prompts needed between batches):
  1. Send batch 1: [Research-Agent1, Research-Agent2]
  2. WAIT → both return with findings
  3. TL synthesizes, decides next action
  4. Send batch 2: [Impl-Agent1, Impl-Agent2] based on findings
  5. WAIT → both return with changes
  6. TL reviews, decides: send verification batch or done?
  7. Continue until project complete
```

**Conflict prevention:** Give parallel subagents non-overlapping scopes (different folders/files).

### Delegated Sessions — External Work

**What:** Spawn an independent agent that works asynchronously and communicates via GitHub.

| Method                                   | Blocking | Communication      | Best For                    |
| ---------------------------------------- | -------- | ------------------ | --------------------------- |
| Cloud Agent                              | ❌ No    | GitHub PR/comments | Simple async implementation |
| `gh agent-task create`                   | ❌ No    | GitHub PR/comments | CLI-based async spawning    |
| `code chat -m "Software Engineer (SWE)"` | ❌ No    | GitHub + workspace | Local parallel sessions     |

**Custom agent CLI syntax:**

```powershell
# Spawn SWE agent (opens new chat tab in current window)
code chat -m "Software Engineer (SWE)" "Your task here"

# Spawn SWE agent in new window (fully non-blocking)
code chat -n -m "Software Engineer (SWE)" "Your task here"

# Spawn Tech Lead agent
code chat -m "Tech Lead (TL)" "Your task here"
```

The `-m` flag accepts the exact `name:` field from the `.agent.md` file (e.g., `"Software Engineer (SWE)"`).

**What TL can and cannot do with spawned sessions:**

| TL Can Do                      | TL Cannot Do                  |
| ------------------------------ | ----------------------------- |
| Spawn with initial task prompt | See spawned agent's chat UI   |
| Poll GitHub for comments/PRs   | Post follow-up prompts        |
| Read workspace file changes    | Get real-time responses       |
| Check board status changes     | Directly restart a stuck chat |

**When TL uses delegated sessions:**

- Implementation work you don't need to wait for
- Scaling to multiple parallel tasks
- Want to continue coordinating while work happens

**CRITICAL: TL must not block on implementation.** When TL uses `runSubagent` for implementation, TL cannot:

- Poll the board for blocked/completed work
- Answer questions from blocked agents
- Review PRs from completed agents
- Spawn more work as capacity allows

Use `runSubagent` only for quick research/verification. Use delegated sessions for implementation.

### TL-SWE Communication Protocol

Since TL cannot see spawned SWE chat sessions, communication happens through GitHub:

**Signal markers (SWE posts these as GitHub comments):**

| Marker                             | Meaning          | TL Action         |
| ---------------------------------- | ---------------- | ----------------- |
| `SWE-HEARTBEAT: <timestamp>`       | Agent alive      | None (monitoring) |
| `SWE-CLAIMED: Issue #X`            | Working on issue | Track in board    |
| `SWE-BLOCKED: Issue #X - <reason>` | Needs help       | Answer on issue   |
| `SWE-COMPLETE: Issue #X, PR #Y`    | Ready for review | Review PR         |
| `SWE-IDLE: No work found`          | Board empty      | Create more work  |

**TL polling loop:**

```powershell
# Check for SWE signals every 60 seconds
$comments = gh api repos/sirjamesoffordii/CMC-Go/issues/<coordination-issue>/comments --jq '.[].body'
# Look for SWE-HEARTBEAT, SWE-BLOCKED, SWE-COMPLETE markers
```

**Restarting a stuck SWE:**

If no heartbeat for 5+ minutes:

1. Check if SWE chat tab is still open (manual)
2. Spawn a new SWE session: `code chat -m "Software Engineer (SWE)" "Continue work..."`

### The Golden Rule

> **Use subagents when you NEED the answer NOW.**
> **Use delegated sessions when you want work done WHILE you continue.**

### Recommended Autonomous Workflow Pattern

For fully autonomous project execution, use a **hybrid approach**:

```
TL Session (Opus 4.5, runs autonomously)
│
├── PHASE 1: Research/Planning (SUBAGENTS)
│   └── Spawn 2-4 SWE subagents to analyze different areas
│   └── All return → TL synthesizes findings
│   └── TL creates executable Issues
│
├── PHASE 2: Implementation (CHOICE based on needs)
│   ├── Option A: Subagents (tight coordination)
│   │   └── Spawn SWE subagents with non-overlapping scopes
│   │   └── Results return → TL reviews immediately
│   │   └── Send next batch based on results
│   │
│   └── Option B: Delegated sessions (parallel independence)
│       └── Fire off cloud agents for independent issues
│       └── TL continues other coordination work
│       └── Poll for completion, review PRs
│
├── PHASE 3: Verification (SUBAGENTS)
│   └── Spawn SWE subagent to verify each PR
│   └── Results return → TL merges or requests fixes
│
└── LOOP until project complete (no user intervention)
```

**When to prefer subagents for implementation:**

- Tasks depend on each other (need to sequence)
- Need to synthesize results across tasks
- Want tighter quality control
- Complex coordination required

**When to prefer delegated sessions:**

- Tasks are truly independent
- High volume of simple tasks
- TL has other coordination work to do
- Want maximum parallelism

### TL Capacity: 4 Delegated Items (not subagents)

- **Subagents don't count** toward TL capacity (they're internal help)
- **Delegated sessions count** toward the 4-item limit (they require TL polling/review)
- If you need more than 4 parallel delegated items, spawn a secondary TL

**Syntax:** Invoke the `runSubagent` tool with `agentName` and `prompt` parameters.

**If you don't have access to `runSubagent`,** you're a spawned agent. Use cloud agents (`gh agent-task create`) or terminal commands instead.

## Standard workflow

1. Tech Lead makes the work executable (Goal/Scope/AC + verification checklist)
2. Tech Lead scores complexity and selects delegation method:
   - **Score 0-1 (trivial):** `runSubagent("SWE Basic")` for docs/comments/lint — OR cloud agent if async preferred
   - **Score 0-2 (simple async):** Cloud Agent (label `agent:copilot-swe` or `gh agent-task create`) — TL continues working
   - **Score 2-4 (standard):** `runSubagent("Software Engineer (SWE)")` — GPT-5.2-Codex
   - **Score 5-6 (complex):** `runSubagent("SWE Opus")` — Claude Opus 4.5
3. Software Engineer implements or verifies (smallest diff + evidence, or checklist + verdict)
4. "Done" requires evidence (commands/results + links)
5. Update Projects v2 as you go (board reflects reality)

### When TL Should Use Subagents vs Delegated Sessions

| Situation                                 | Use Subagent         | Use Delegated Session |
| ----------------------------------------- | -------------------- | --------------------- |
| Need answer before deciding next step     | ✅ Yes               | ❌ No                 |
| Research/analysis across multiple topics  | ✅ Yes (parallel)    | ❌ No                 |
| Quick verification of a PR                | ✅ Yes               | ❌ No                 |
| Simple implementation, don't need to wait | ❌ No                | ✅ Cloud Agent        |
| Multiple parallel implementations         | ❌ No                | ✅ Multiple Cloud     |
| Complex implementation, need result       | ✅ SWE Opus subagent | ❌ No                 |
| Bulk tasks (5+ issues)                    | ❌ No                | ✅ Multiple Cloud     |

## Agent Spawning Behavior (tested)

These behaviors were empirically verified:

### Blocking vs Non-Blocking (critical)

| Spawn Method                         | Blocking?         | How It Works                           | When to Use                         |
| ------------------------------------ | ----------------- | -------------------------------------- | ----------------------------------- |
| `runSubagent`                        | ✅ BLOCKING       | TL waits for result                    | Need answer before continuing       |
| Parallel `runSubagent`               | ✅ BLOCKING (all) | TL waits for ALL to complete           | Independent tasks, need all results |
| Cloud Agent (`copilot-coding-agent`) | ❌ NON-BLOCKING   | Returns immediately, agent works async | Fire-and-forget tasks, scaling      |
| `gh agent-task create`               | ❌ NON-BLOCKING   | CLI spawns cloud agent, returns URL    | Scripted/terminal agent spawning    |
| `code chat -n -m "<agent>"`          | ❌ NON-BLOCKING   | Opens new VS Code window with agent    | Local parallel agent sessions       |

**There is NO async/non-blocking `runSubagent`**. The ONLY way to continue working while an agent executes is to use Cloud Agents or spawn new VS Code windows via `code chat -n -m "Software Engineer (SWE)"`.

### Non-Blocking Spawn Methods

#### 1. `gh agent-task create` (CLI - Recommended for simple tasks)

Spawn cloud agents from terminal without VS Code tools:

```powershell
# Non-blocking task creation (returns URL immediately)
gh agent-task create "Fix the login bug" --base staging

# List active agent tasks
gh agent-task list -L 10
```

**Tested:** Spawned 6 agents in parallel, all worked concurrently (PRs #209-214).

#### 2. `code chat` (Local Agent with Custom Mode)

Spawn local agent sessions with custom agents:

```powershell
# Spawn SWE agent in current window
code chat -m "Software Engineer (SWE)" "Implement Issue #42"

# Spawn SWE agent in new window (non-blocking)
code chat -n -m "Software Engineer (SWE)" "Implement Issue #42"

# Spawn Tech Lead agent
code chat -m "Tech Lead (TL)" "Review project board and delegate"

# Options:
#   -n, --new-window      Force new window (non-blocking)
#   -r, --reuse-window    Use last active window
#   -m, --mode <id>       Mode: 'ask', 'edit', 'agent', or custom agent name
#   -a, --add-file        Add file context
```

**Custom agent identifiers** use the exact `name:` field from the `.agent.md` file (e.g., `"Software Engineer (SWE)"`).

**Note:** Shares Copilot subscription with primary session.

## Scalable Workflow Summary

**The Golden Rule:** Use `runSubagent` when you NEED the answer. Use cloud agents when you DON'T.

### Quick Decision

| Need                    | Method                   | Blocking?         | Model          |
| ----------------------- | ------------------------ | ----------------- | -------------- |
| Trivial task (0-1)      | `runSubagent` SWE Basic  | ✅ Yes (but free) | GPT 4.1 (0×)   |
| Research/analysis       | `runSubagent` (parallel) | ✅ Yes            | Varies by need |
| Simple async task (0-2) | `gh agent-task create`   | ❌ No             | GitHub default |
| Standard task (2-4)     | `runSubagent` SWE        | ✅ Yes            | GPT-5.2 (1×)   |
| Complex task (5-6)      | `runSubagent` SWE Opus   | ✅ Yes            | Opus 4.5 (3×)  |
| Bulk tasks (10+)        | Multiple `gh agent-task` | ❌ No             | GitHub default |

### The Pattern

```
1. RESEARCH (if needed) → runSubagent (blocking, parallel OK)
2. DISPATCH → gh agent-task create (non-blocking, fire-and-forget)
3. CONTINUE → TL keeps coordinating while agents work
4. HARVEST → Poll `gh agent-task list`, review PRs, merge
```

### Tested Limits

- Parallel `runSubagent`: 6+ (all return)
- Parallel cloud agents: 50+ (no practical limit)
- Local sessions via `code chat -m`: 5-10 (system resources)
- Subagents do NOT count toward TL's 4-item capacity

### Premium requests

**Subagents DO consume premium requests.** Each `runSubagent` call uses the selected model's quota — GPT 4.1 (0×), GPT-5.2-Codex (1×), or Opus 4.5 (3×). Since subagents spawn frequently, choose models wisely. Default to GPT-5.2-Codex (1×) and reserve Opus (3×) for complexity score 4+.

**Cloud agents** (`gh agent-task`, `copilot-coding-agent`) use a dedicated SKU (separate billing). They don't count against your premium request quota.

### Use Cases by Agent Type

| Use Case                   | Best Method                 | Why                                |
| -------------------------- | --------------------------- | ---------------------------------- |
| **Research/Analysis**      | `runSubagent` (parallel)    | Get results back, combine findings |
| **Quick verification**     | `runSubagent` (single)      | Need verdict before proceeding     |
| **Simple implementation**  | Cloud agent                 | Fire-and-forget, don't wait        |
| **Bulk simple tasks**      | Multiple cloud agents       | Scale to 50+ in parallel           |
| **Complex implementation** | `runSubagent` (SWE Opus)    | Need premium model, get result     |
| **Local parallel work**    | `code chat -n -m "<agent>"` | Multiple VS Code windows           |

### Spawning hierarchy

```
PRIMARY TL (has runSubagent tool)
├── Can spawn local SWE ✅ (blocking)
├── Can spawn local TL ✅ (blocking)
├── Can spawn cloud agents ✅ (non-blocking)
├── Can run `gh agent-task create` ✅ (non-blocking)
├── Can run `code chat -m "<agent>"` ✅ (non-blocking, new window)
│
└── SPAWNED agents (no runSubagent tool)
    ├── Cannot spawn local agents ❌
    ├── CAN spawn cloud agents ✅ (non-blocking)
    └── CAN run `gh agent-task create` ✅ (terminal access)
```

Only the **primary agent session** has access to `runSubagent`. Spawned agents can delegate via cloud agents or CLI.

### Parallel spawning (local agents)

TL can spawn **multiple local agents in parallel** in a single call:

```
runSubagent([SWE-1, SWE-2, SWE-3, SWE-4])  // All run in parallel
```

TL is blocked until ALL return, but they execute concurrently. No hard limit found (tested up to 6).

### Async spawning (cloud agents)

TL can dispatch **multiple cloud agents** and continue working:

```powershell
# Via tool (in chat):
copilot-coding-agent(Issue #1)  # Returns immediately
copilot-coding-agent(Issue #2)  # Returns immediately

# Via CLI (from terminal):
gh agent-task create "Task 1" --base staging  # Returns URL immediately
gh agent-task create "Task 2" --base staging  # Returns URL immediately
gh agent-task create "Task 3" --base staging  # Returns URL immediately
# TL continues working while all 3 agents execute in parallel
```

Cloud agents:

- Create branches automatically
- Open PRs when complete
- TL discovers completion via `gh agent-task list` or board polling

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

## End-of-Task Reflection (10 seconds)

**Every PR includes two lines. That's it.**

```markdown
## End-of-Task Reflection

- **Workflow:** No changes / [file] — [change]
- **Patterns:** No changes / [file] — [change]
```

### Decision tree (think, don't write)

1. Did something waste your time that docs could have prevented? → Edit the doc
2. Did you solve a non-obvious problem others will hit? → Add to CMC_GO_PATTERNS.md
3. Neither? → Write "No changes" and move on

**Don't grep, don't explain, don't ask permission.** If you have something to add, add it. If not, write "No changes" and you're done.

### If adding a pattern

Add directly to `CMC_GO_PATTERNS.md` under the right category. Keep it to 2-3 lines max.

### If editing workflow docs

Make surgical edits. Avoid contradictions. TL reviews via PR approval.

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
