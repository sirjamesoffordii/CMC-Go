# CMC Go — Agent Manual

## Quick Start

```powershell
# 1. Auth (replace <account> with your account name)
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-<account>"; gh auth status

# 2. Check board
gh project item-list 4 --owner sirjamesoffordii --limit 20

# 3. Execute your role (see Roles below)
```

## Architecture

```
Principal Engineer (continuous) ─┬─ Tech Lead (continuous) ─┬─ Software Engineer (continuous)
                                 │                          │
All 3 agents run simultaneously in separate VS Code sessions (tabs)
```

**All 3 agents run in parallel:**

- **Principal Engineer** — monitors heartbeats, creates issues, respawns stale TL
- **Tech Lead** — assigns work via `assignment.json`, reviews/merges PRs
- **Software Engineer** — implements issues, creates PRs, returns to idle

**Critical invariant:** Heartbeat registration is the FIRST action on activation. Without a heartbeat, an agent doesn't exist to the system.

## Roles

| Role               | Account                  | Managed By         | Purpose                                 |
| ------------------ | ------------------------ | ------------------ | --------------------------------------- |
| Principal Engineer | Principle-Engineer-Agent | Human              | Issues, exploration, oversight          |
| Tech Lead          | Alpha-Tech-Lead          | Principal Engineer | Coordination, PR review, small edits    |
| Software Engineer  | Software-Engineer-Agent  | Tech Lead          | Implementation (parallel via subagents) |

**Behavior files:** `.github/agents/{role}.agent.md`

### Role Capabilities Summary

| Capability              | PE  | TL   | SE  |
| ----------------------- | --- | ---- | --- |
| Create issues           | ✅  | ✅\* | ❌  |
| Review PRs              | ✅  | ✅   | ❌  |
| Merge PRs               | ✅  | ✅   | ❌  |
| Small PR edits          | ❌  | ✅   | ❌  |
| Full implementation     | ❌  | ✅†  | ✅  |
| Use subagents           | ✅  | ✅   | ✅  |
| Spawn other agents      | ✅  | ✅   | ✅‡ |
| Set UI/UX Review status | ✅  | ✅   | ❌  |

\*TL issues go to Draft (TL) status for PE approval
†TL can do small issues after 1 min idle (directly or via subagents)
‡SE can respawn stale TL

## Board

**URL:** https://github.com/users/sirjamesoffordii/projects/4

| Status           | Owner                          | Description                                       | Action                                     |
| ---------------- | ------------------------------ | ------------------------------------------------- | ------------------------------------------ |
| Blocked          | Tech Lead / Principal Engineer | Work cannot proceed until PE/TL action is taken   | TL blocks + comments, PE reviews           |
| AEOS Improvement | Principal Engineer             | Workflow improvement suggestions                  | PE reviews, user checks items to approve   |
| Exploratory      | Human                          | Needs User Approval to Become Todo                | User checks items they want implemented    |
| Draft (TL)       | Principal Engineer             | Drafted by TL. Needs PE approval. Not executable. | PE reviews TL suggestions → Todo or reject |
| Todo             | Tech Lead                      | This item hasn't been started                     | TL assigns to Software Engineer            |
| In Progress      | Software Engineer              | This is actively being worked on                  | SE implements, creates PR                  |
| Verify           | Tech Lead/Principal Engineer   | Ready for Verification                            | Review PR, check for UI/UX changes         |
| UI/UX. Review    | Human                          | Need user approval to Merge                       | User approves visual changes               |
| Done             | —                              | This has been completed                           | Merged and closed, auto-archived           |

**Board IDs (for GraphQL mutations):**

- Project: `PVT_kwHODqX6Qs4BNUfu` | Status Field: `PVTSSF_lAHODqX6Qs4BNUfuzg8WaYA`

| Status           | ID         |
| ---------------- | ---------- |
| Blocked          | `652442a1` |
| AEOS Improvement | `adf06f76` |
| Exploratory      | `041398cc` |
| Draft (TL)       | `687f4500` |
| Todo             | `f75ad846` |
| In Progress      | `47fc9ee4` |
| Verify           | `5351d827` |
| UI/UX. Review    | `576c99fd` |
| Done             | `98236657` |

**Issue Flow:**

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    AEOS WORKFLOW                         │
                    └─────────────────────────────────────────────────────────┘

PE explores codebase ──► Exploratory (user checks items) ──► PE creates Todos
                              │
TL observes problems ──► Draft (TL) ──► PE approves ──► Todo
                              │                            │
                              │                            ▼
TL/SE blocks issue ──► Blocked ──► PE reviews ──►  Todo (or close)
                                                           │
                                                           ▼
                                              TL assigns via assignment.json
                                                           │
                                                           ▼
                                                     In Progress
                                                           │
                                                           ▼
                                                SE creates PR ──► Verify
                                                                    │
                                               ┌────────────────────┴────────────────────┐
                                               │                                         │
                                               ▼                                         ▼
                                    (no UI/UX change)                         (has UI/UX change)
                                               │                                         │
                                               ▼                                         ▼
                                          TL merges                              UI/UX. Review
                                               │                                         │
                                               │                          User approves ──┘
                                               ▼                                         │
                                             Done ◄──────────────────────────────────────┘

AEOS Improvement: PE/TL/SE observe friction ──► #348 comments ──► PE promotes to checklist
```

**IDs (for GraphQL):**

- Project: `PVT_kwHODqX6Qs4BNUfu` | Status Field: `PVTSSF_lAHODqX6Qs4BNUfuzg8WaYA`

| Status           | ID         |
| ---------------- | ---------- |
| Blocked          | `652442a1` |
| AEOS Improvement | `adf06f76` |
| Exploratory      | `041398cc` |
| Draft (TL)       | `687f4500` |
| Todo             | `f75ad846` |
| In Progress      | `47fc9ee4` |
| Verify           | `5351d827` |
| UI/UX. Review    | `576c99fd` |
| Done             | `98236657` |

## Heartbeat

**File:** `.github/agents/heartbeat.json` (gitignored)

```json
{
  "PE": { "ts": "2026-02-02T12:00:00Z", "status": "monitoring" },
  "TL": { "ts": "2026-02-02T12:00:00Z", "status": "reviewing-pr", "pr": 123 },
  "SE": {
    "ts": "2026-02-02T12:00:00Z",
    "status": "implementing",
    "issue": 42,
    "worktree": "C:/Dev/CMC-Go-Worktrees/wt-impl-42"
  }
}
```

**Update via script:**

```powershell
.\scripts\update-heartbeat.ps1 -Role TL -Status "reviewing-pr-123" -PR 123
.\scripts\update-heartbeat.ps1 -Role SE -Status "implementing" -Issue 42 -Worktree "C:/Dev/CMC-Go-Worktrees/wt-impl-42"
.\scripts\update-heartbeat.ps1 -Role PE -Status "monitoring"
```

**Protocol:**

- Update every 3 min with current status
- SE must include worktree path (for verification)
- Stale = no update in 6+ min

**Reading heartbeat safely:**

```powershell
# Always use the safe reader (handles corruption gracefully)
$hb = .\scripts\read-heartbeat.ps1
```

### Mid-Work Heartbeat Checkpoints

Long operations MUST include heartbeat updates at logical checkpoints to prevent false stale detection:

**SE Implementation Checkpoints:**

```powershell
# After claiming assignment
.\scripts\update-heartbeat.ps1 -Role SE -Status "claimed-$issueNum" -Issue $issueNum

# After branch creation
.\scripts\update-heartbeat.ps1 -Role SE -Status "branched-$issueNum" -Issue $issueNum

# After each significant file edit (every 2-3 files)
.\scripts\update-heartbeat.ps1 -Role SE -Status "editing-$issueNum" -Issue $issueNum

# After running tests
.\scripts\update-heartbeat.ps1 -Role SE -Status "testing-$issueNum" -Issue $issueNum

# After creating PR
.\scripts\update-heartbeat.ps1 -Role SE -Status "pr-created-$issueNum" -Issue $issueNum
```

**TL PR Review Checkpoints:**

```powershell
# Starting review
.\scripts\update-heartbeat.ps1 -Role TL -Status "reviewing-pr-$prNum" -PR $prNum

# After reading changed files
.\scripts\update-heartbeat.ps1 -Role TL -Status "analyzing-pr-$prNum" -PR $prNum

# After merge decision
.\scripts\update-heartbeat.ps1 -Role TL -Status "merging-pr-$prNum" -PR $prNum
```

**PE Review Checkpoints:**

```powershell
# Starting codebase review
.\scripts\update-heartbeat.ps1 -Role PE -Status "reviewing-codebase"

# Creating issues
.\scripts\update-heartbeat.ps1 -Role PE -Status "creating-issues"

# Reviewing board
.\scripts\update-heartbeat.ps1 -Role PE -Status "reviewing-board"
```

**Rule of Thumb:** If an operation might take >3 minutes, add a checkpoint heartbeat.

**Staleness Detection & Recovery:**

| Agent | Monitored By | If Stale (>6 min)                                       |
| ----- | ------------ | ------------------------------------------------------- |
| PE    | TL           | TL respawns PE via `code chat`                          |
| TL    | PE + SE      | PE or SE respawns TL via `code chat`                    |
| SE    | TL           | TL respawns SE via `.\scripts\spawn-worktree-agent.ps1` |

**Self-healing principle:** Any surviving agent can respawn any other agent. This ensures the system recovers automatically without human intervention.

**PE monitors TL:**

```powershell
$hb = .\scripts\read-heartbeat.ps1
if ($hb.TL) {
    $tlTs = [DateTime]::Parse($hb.TL.ts)
    $staleMinutes = ((Get-Date).ToUniversalTime() - $tlTs).TotalMinutes
    if ($staleMinutes -gt 6) {
        Write-Host "TL stale ($staleMinutes min) - respawning..." -ForegroundColor Yellow
        .\scripts\spawn-agent.ps1 -Agent TL
    }
}
```

**TL monitors PE + SE:**

```powershell
$hb = .\scripts\read-heartbeat.ps1

# Monitor PE - respawn if stale
if ($hb.PE) {
    $peTs = [DateTime]::Parse($hb.PE.ts)
    $staleMinutes = ((Get-Date).ToUniversalTime() - $peTs).TotalMinutes
    if ($staleMinutes -gt 6) {
        Write-Host "PE stale ($staleMinutes min) - respawning..." -ForegroundColor Yellow
        .\scripts\spawn-agent.ps1 -Agent PE
    }
}

# Monitor SE - respawn if stale
if ($hb.SE) {
    $seTs = [DateTime]::Parse($hb.SE.ts)
    $staleMinutes = ((Get-Date).ToUniversalTime() - $seTs).TotalMinutes
    if ($staleMinutes -gt 6) {
        Write-Host "SE stale ($staleMinutes min) - respawning..." -ForegroundColor Yellow
        .\scripts\spawn-worktree-agent.ps1
    }
}
```

**SE monitors TL:**

```powershell
$hb = .\scripts\read-heartbeat.ps1

# Monitor TL - respawn if stale
if ($hb.TL) {
    $tlTs = [DateTime]::Parse($hb.TL.ts)
    $staleMinutes = ((Get-Date).ToUniversalTime() - $tlTs).TotalMinutes
    if ($staleMinutes -gt 6) {
        Write-Host "TL stale ($staleMinutes min) - respawning..." -ForegroundColor Yellow
        .\scripts\spawn-agent.ps1 -Agent TL
    }
}
```

## Assignment (Tech Lead → Software Engineer Signaling)

**File:** `.github/agents/assignment.json` (gitignored)

Tech Lead writes this file to signal what Software Engineer should work on next. Software Engineer reads and clears it.

```json
{
  "issue": 42,
  "priority": "high",
  "assignedAt": "2026-02-02T12:00:00Z",
  "assignedBy": "TechLead"
}
```

**Protocol:**

1. **Tech Lead assigns:** Write `assignment.json` with issue details
2. **Software Engineer checks:** On loop iteration, check if file exists
3. **Software Engineer claims:** Read issue number, then delete the file (atomic claim)
4. **Software Engineer works:** Implement the issue, create PR
5. **Software Engineer completes:** Update heartbeat status to "idle", loop back to step 2

**Claim pattern (Software Engineer):**

```powershell
$assignmentFile = ".github/agents/assignment.json"
if (Test-Path $assignmentFile) {
    $assignment = Get-Content $assignmentFile | ConvertFrom-Json
    Remove-Item $assignmentFile  # Claim it
    # Now work on $assignment.issue
}
```

**Assign pattern (Tech Lead):**

```powershell
$assignment = @{
    issue = 42
    priority = "high"
    assignedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    assignedBy = "TechLead"
} | ConvertTo-Json
$assignment | Set-Content ".github/agents/assignment.json" -Encoding utf8
```

## Agent Startup

**Human starts any agent using VS Code prompts:**

| To Start           | Use Prompt                     |
| ------------------ | ------------------------------ |
| Principal Engineer | `/activate Principal Engineer` |
| Tech Lead          | `/activate Tech Lead`          |
| Software Engineer  | `/activate Software Engineer`  |

**CLI/Task Spawning:**

| Method                       | Command/Task                                      |
| ---------------------------- | ------------------------------------------------- |
| Spawn PE via script          | `.\scripts\spawn-agent.ps1 -Agent PE`             |
| Spawn TL via script          | `.\scripts\spawn-agent.ps1 -Agent TL`             |
| Spawn SE via script          | `.\scripts\spawn-agent.ps1 -Agent SE`             |
| Spawn with VS Code profile   | `.\scripts\spawn-agent.ps1 -Agent TL -UseProfile` |
| VS Code Task: AEOS: Spawn PE | Ctrl+Shift+P → "Tasks: Run Task"                  |
| VS Code Task: AEOS: Spawn TL | Ctrl+Shift+P → "Tasks: Run Task"                  |
| VS Code Task: AEOS: Spawn SE | Ctrl+Shift+P → "Tasks: Run Task"                  |

**Activation message format (EXACT - used by all spawn methods):**

```
You are <Role> 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW.
```

**Examples:**

- `You are Principal Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW.`
- `You are Tech Lead 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW.`
- `You are Software Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW.`

**Programmatic respawn (when agents respawn each other):**

```powershell
# PE respawning TL (with correct model)
.\scripts\spawn-agent.ps1 -Agent TL

# TL respawning PE (with correct model)
.\scripts\spawn-agent.ps1 -Agent PE

# TL spawning SE in worktree (with correct model)
.\scripts\spawn-agent.ps1 -Agent SE
```

**Manual model setting (if needed):**

```powershell
# Set model before opening VS Code
.\scripts\set-copilot-model.ps1 -Model "gpt-5.2-codex"

# List available models
.\scripts\set-copilot-model.ps1 -List
```

## Model Distribution (Rate Limit Strategy)

Each agent uses a designated PRIMARY model. Backups only apply after rate limit is verified.

| Agent              | PRIMARY Model   | BACKUP Model      | Fallback Behavior            |
| ------------------ | --------------- | ----------------- | ---------------------------- |
| Principal Engineer | Claude Opus 4.5 | —                 | Retry Opus 4.5 (no fallback) |
| Tech Lead          | GPT 5.2         | Claude Sonnet 4.5 | Switch after 429 verified    |
| Software Engineer  | GPT 5.2 Codex   | GPT 5.1 Codex Max | Switch after 429 verified    |

**Model rationale:**

1. **PE uses Opus 4.5** - Best reasoning for architecture decisions, exploration, and oversight
2. **TL uses GPT 5.2** - Fast coordination and PR reviews
3. **SE uses GPT 5.2 Codex** - Optimized for code generation

**Fallback rules:**

- PE has NO backup - retry Opus 4.5 on rate limit (reasoning quality is critical)
- TL/SE switch to backup ONLY after 429 is verified via logs
- Never preemptively switch - always try primary first

**How it works:**

- `spawn-agent.ps1` modifies VS Code's SQLite state database before launching
- The `set-copilot-model.ps1` script writes to `chat.currentLanguageModel.panel` key
- New VS Code sessions pick up the model from the database
- Existing sessions keep their current model (memory-cached)

**Rate limit recovery:**

```powershell
# If an agent hits rate limits, respawn with backup model
.\scripts\spawn-agent.ps1 -Agent TL -UseBackup
```

**Key insight:** VS Code stores the selected model in `%APPDATA%\Code\User\globalStorage\state.vscdb`. By writing to this SQLite database before opening a new session, we can pre-select the model.

All agents run continuously. Tech Lead assigns work via `assignment.json`.

## Worktrees (SE Isolation)

**SE MUST work in an isolated worktree. This is NON-NEGOTIABLE.**

Why worktrees?

- Prevents file contention when PE/TL are in main workspace
- Isolated working directory for SE
- Main repo stays clean for coordination
- SE creates branches per-issue from within worktree

### TL Spawns SE (One Time)

```powershell
# Spawn SE once - it runs continuously and picks up work via assignment.json
.\scripts\spawn-worktree-agent.ps1
```

This script:

1. Creates worktree at `C:/Dev/CMC-Go-Worktrees/wt-se`
2. Opens VS Code in that worktree
3. Starts SE agent session with proper prompt

**SE is persistent:** Once spawned, SE loops forever checking for assignments. TL does NOT spawn SE per-issue.

### SE Branch Per-Issue

SE creates branches for each issue from within the worktree:

```powershell
# SE runs this when picking up an assignment
git fetch origin
git checkout -b agent/se/<issue>-<slug> origin/staging
```

### SE Pre-Flight Check

Before ANY file edits, SE must verify:

```powershell
$cwd = (Get-Location).Path
if ($cwd -match "C:\\\\Dev\\\\CMC Go$|C:/Dev/CMC Go$") {
    Write-Error "ABORT: In main repo! SE must work in worktree."
    # Do not proceed with edits
}
```

### Cleanup (TL does after merge)

```powershell
# Clean up merged branch (worktree stays for next issue)
git branch -d agent/se/<issue>-<slug>
```

## Branch Cleanup

After PRs are merged, periodically clean up old branches:

```powershell
.\scripts\cleanup-agent-branches.ps1
```

## Branch & Commit

- **Branch:** `agent/se/<issue#>-<slug>` (e.g., `agent/se/42-fix-bug`)
- **Commit:** `agent(se): <summary>`
- **PR Title:** `[#<issue>] <description>`
- **PR Body:** Must include `Closes #<issue>`

## Rules

1. **Board is truth** — Update status immediately
2. **Small diffs** — Optimize for reviewability
3. **Evidence in PRs** — Commands + results
4. **Never stop** — Loop until Done or Blocked
5. **One SE at a time** — Wait for PR merge before next assignment
6. **Check rate limits** — Before assigning work, verify quota
7. **SE uses worktree** — NEVER edit files in main repo
8. **Avoid interactive commands** — See "Dangerous Commands" section

## Dangerous Commands (Avoid in Autonomous Flow)

Some commands hang waiting for user input. **NEVER run these directly:**

| Command                    | Problem                          | Safe Alternative                 |
| -------------------------- | -------------------------------- | -------------------------------- |
| `npx drizzle-kit push`     | Prompts for column rename/create | `pnpm db:push:yes`               |
| `npx drizzle-kit generate` | May prompt for migration name    | Use explicit `--name` flag       |
| `git rebase -i`            | Opens editor                     | `git rebase --no-edit`           |
| `git commit` (no -m)       | Opens editor                     | `git commit -m "message"`        |
| `npm init`                 | Interactive wizard               | `npm init -y`                    |
| Any command with `--help`  | May page with `less`             | Pipe to `Select-Object -First N` |

**db:push:yes is safe:** Auto-confirms prompts, 2-min timeout, auto-exits on failure.

**Recovery pattern for SE:**

```powershell
# If db:push:yes fails or times out, continue and note in PR
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ db:push failed - noting in PR" -ForegroundColor Yellow
    # Continue with implementation, note in PR body
}
```

## Rate Limits

Agents consume two types of rate-limited resources:

| Resource                | Limit          | Usage                    | Check                  |
| ----------------------- | -------------- | ------------------------ | ---------------------- |
| GitHub GraphQL API      | 5000/hour      | Board ops, issue queries | `gh api rate_limit`    |
| GitHub REST API         | 5000/hour      | PR ops, file fetches     | Same                   |
| Model tokens (Opus 4.5) | Plan-dependent | Every agent response     | Not directly checkable |

**Before assigning work:**

```powershell
$check = .\scripts\check-rate-limits.ps1
$check | Format-List  # status, graphql, core, resetIn, message
```

**Status meanings:**

- `go`: Quota healthy (>500 GraphQL, >200 REST)
- `wait`: Quota low (<500 GraphQL) - proceed with caution
- `stop`: Quota critical (<100 GraphQL) - wait for reset

**Scaling guidance:**

| Configuration                                            | Expected GraphQL/hr | Safe?  |
| -------------------------------------------------------- | ------------------- | ------ |
| 1 Principal Engineer + 1 Tech Lead + 1 Software Engineer | ~500-1000           | ✅ Yes |

**Note:** Model token limits (GPT 5.2 Codex) are plan-dependent and not directly observable. If agents fail with quota errors, check plan limits.

## Copilot Rate Limits (Model Quotas)

Copilot Chat models have separate per-model rate limits. When exhausted, you'll see:

- User message: "Sorry, you have exhausted this model's rate limit"
- Log error: `[error] Server error: 429 too many requests`

**Detection via VS Code Logs:**

All Copilot errors are logged to:

```
%APPDATA%\Code\logs\<session>\<window>\exthost\GitHub.copilot-chat\GitHub Copilot Chat.log
```

**Cross-Agent Monitoring:**

Since all VS Code sessions share the same logs directory, ANY agent can monitor ALL agents' rate limit status:

```powershell
# One-time check (returns structured object)
$status = .\scripts\monitor-agent-rate-limits.ps1 -Once
if ($status.anyRateLimited) {
    Write-Host "An agent hit rate limits!" -ForegroundColor Red
    Write-Host "Affected sessions: $($status.windowsAffected -join ', ')"
}

# Continuous monitoring (run as background process)
.\scripts\monitor-agent-rate-limits.ps1  # Polls every 5 seconds
```

**Alert File:** `.github/agents/rate-limit-alert.json` (auto-updated by monitor)

**Model Fallback Strategy:**

| Agent | Primary         | Backup            | When to Switch                     |
| ----- | --------------- | ----------------- | ---------------------------------- |
| PE    | Claude Opus 4.5 | —                 | Never switch (retry primary)       |
| TL    | GPT 5.2         | Claude Sonnet 4.5 | After 429 verified in VS Code logs |
| SE    | GPT 5.2 Codex   | GPT 5.1 Codex Max | After 429 verified in VS Code logs |

**How to verify 429:**

```powershell
# Check VS Code logs for rate limit errors
$logPath = "$env:APPDATA\Code\logs"
Get-ChildItem $logPath -Recurse -Filter "*.log" | Select-String "429" -List
```

**Only switch if 429 confirmed.** Model inheritance means respawned agents get current model, not the one in frontmatter.

**Recovery Pattern:**

```powershell
# PE/TL: Before assigning work, check if any agent is rate limited
$rl = .\scripts\monitor-agent-rate-limits.ps1 -Once
if ($rl.anyRateLimited) {
    Write-Host "⚠️ Rate limit detected - waiting 5 min before assignment" -ForegroundColor Yellow
    Start-Sleep -Seconds 300
}
```

## AEOS Self-Improvement (MANDATORY)

Agents **MUST** report workflow friction in real-time to issue #348.

**Tracking Issue:** `[AEOS] Workflow Improvements` (#348)

### How to Report (Copy-Paste Commands)

**Tech Lead:**

```powershell
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-alpha-tech-lead"
gh issue comment 348 --repo sirjamesoffordii/CMC-Go --body "**Tech Lead observation:** <problem> → <suggested fix>"
```

**Software Engineer:**

```powershell
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-software-engineer-agent"
gh issue comment 348 --repo sirjamesoffordii/CMC-Go --body "**Software Engineer observation:** <problem> → <suggested fix>"
```

**Principal Engineer:**

```powershell
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-principal-engineer-agent"
gh issue comment 348 --repo sirjamesoffordii/CMC-Go --body "**PE observation:** <problem> → <suggested fix>"
```

### When to Report

| Trigger          | Example                                                         |
| ---------------- | --------------------------------------------------------------- |
| CI failure/delay | "CI queued for 10+ min → Add runner status check"               |
| Tool failure     | "File edit didn't apply → Verify with git diff after each edit" |
| Heartbeat issue  | "SE went stale during long test run → Add mid-test checkpoint"  |
| Board sync issue | "Item added without status → Auto-set Todo on add"              |
| Rate limit hit   | "GraphQL quota exhausted → Add REST fallback"                   |

**Report immediately when friction occurs, not at end of session.**

### Process

1. TL/SE adds comment to #348 (using commands above)
2. PE reviews comments and promotes to checklist in issue body
3. Human checks items to approve for implementation

**PE Review Responsibilities (CRITICAL):**

Before promoting any TL/SE observation to the checklist, PE must verify:

| Check        | Question                                                         |
| ------------ | ---------------------------------------------------------------- |
| Coherence    | Does this fix make architectural sense?                          |
| Conflicts    | Could this break something else or conflict with existing items? |
| Redundancy   | Is this already covered by another item?                         |
| Scope        | Is the fix appropriately scoped (not too broad/narrow)?          |
| Side effects | Could fixing this hurt another area?                             |

**If conflict detected:** PE adds a reply comment explaining the issue and proposing a resolution before promoting.

**Who contributes what:**

| Role               | Perspective                         | Example Observations                                |
| ------------------ | ----------------------------------- | --------------------------------------------------- |
| Principal Engineer | Architecture, oversight, **review** | Rate limits, agent coordination, conflict detection |
| Tech Lead          | Coordination, PR flow               | Assignment issues, merge problems                   |
| Software Engineer  | Implementation, tooling             | Test setup, file edits, patterns                    |

## Utility Scripts

| Script                          | Purpose                                  | Usage                       |
| ------------------------------- | ---------------------------------------- | --------------------------- |
| `check-rate-limits.ps1`         | GitHub API quota check                   | Before expensive operations |
| `check-ci-status.ps1`           | Human-readable CI status                 | Diagnose build failures     |
| `verify-merge.ps1`              | Post-merge verification                  | After `gh pr merge`         |
| `add-board-item.ps1`            | Add issue to board with status           | Prevents limbo items        |
| `update-heartbeat.ps1`          | Update agent heartbeat                   | Every 3 min in loop         |
| `read-heartbeat.ps1`            | Safe heartbeat reader                    | Monitor other agents        |
| `spawn-worktree-agent.ps1`      | Spawn persistent SE in worktree          | TL spawns SE once           |
| `spawn-agent.ps1`               | Spawn any agent (PE/TL/SE) with model    | Human or agent restart      |
| `set-copilot-model.ps1`         | Set Copilot model via SQLite             | Before spawning agents      |
| `cleanup-agent-branches.ps1`    | Clean merged agent branches              | After several PRs merged    |
| `aeos-status.ps1`               | Full AEOS system status                  | Debugging coordination      |
| `monitor-agent-rate-limits.ps1` | Cross-agent Copilot rate limit detection | PE/TL monitors all sessions |
| `check-copilot-rate-limits.ps1` | Single-agent Copilot quota check         | Quick self-check            |

## Known Issues & Gotchas

### Board Pagination

`gh project item-list` defaults to 50 items. The board has 180+ items. **Always use `--limit 200`:**

```powershell
gh project item-list 4 --owner sirjamesoffordii --limit 200 --format json
```

### Phantom File Modifications

Sometimes files (especially `client/src/components/DistrictPanel.tsx`) appear modified without any edits. This can block commits due to pre-commit hooks.

**Resolution:**

```powershell
# Discard phantom changes before committing
git checkout -- <file>
# Or reset all unstaged changes
git checkout -- .
```

### Worktree Branch Confusion

If the main repo appears to be on the wrong branch, check worktrees:

```powershell
git worktree list
cat .git/HEAD  # Shows actual HEAD reference
```

A worktree may have checked out the main repo to a different branch. The main workspace should typically be on `staging`.

### Model Selection in AEOS

**Autonomous agents use `spawn-agent.ps1`** which preselects the correct model before opening a new VS Code window. This ensures:

- PE starts on Claude Opus 4.5
- TL starts on GPT 5.2
- SE starts on GPT 5.2 Codex

**Human-activated agents (via `/activate` prompts)** inherit the current window's model. If you use `/activate Tech Lead` in an Opus window, TL will run on Opus. This is fine for human use since you can select the model before clicking send.

**Rule:** For autonomous AEOS, always use `spawn-agent.ps1`. For manual testing, use `/activate` prompts.

## Reference

| Doc                                                               | Purpose          |
| ----------------------------------------------------------------- | ---------------- |
| [IDENTITY_SYSTEM.md](docs/aeos/IDENTITY_SYSTEM.md)                | Auth setup       |
| [TROUBLESHOOTING.md](docs/aeos/TROUBLESHOOTING.md)                | Recovery         |
| [CMC_GO_PATTERNS.md](.github/agents/reference/CMC_GO_PATTERNS.md) | Learned patterns |
