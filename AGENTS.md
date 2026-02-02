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
All 3 agents run simultaneously in separate VS Code windows
```

**All 3 agents run in parallel:**

- **Principal Engineer** — monitors heartbeats, creates issues, respawns stale TL
- **Tech Lead** — assigns work via `assignment.json`, reviews/merges PRs
- **Software Engineer** — implements issues, creates PRs, returns to idle

**Critical invariant:** Heartbeat registration is the FIRST action on activation. Without a heartbeat, an agent doesn't exist to the system.

## Roles

| Role               | Account                  | Managed By         | Purpose                       |
| ------------------ | ------------------------ | ------------------ | ----------------------------- |
| Principal Engineer | Principle-Engineer-Agent | Human              | Issues, priorities, oversight |
| Tech Lead          | Alpha-Tech-Lead          | Principal Engineer | Coordination, PR review       |
| Software Engineer  | Software-Engineer-Agent  | Tech Lead          | Implementation                |

**Behavior files:** `.github/agents/{role}.agent.md`

## Board

**URL:** https://github.com/users/sirjamesoffordii/projects/4

| Status      | Owner                        | Action                       |
| ----------- | ---------------------------- | ---------------------------- |
| Todo        | Tech Lead                    | Assign to Software Engineer  |
| In Progress | Software Engineer            | Being implemented            |
| Verify      | Tech Lead/Principal Engineer | Review and merge PR          |
| Blocked     | Principal Engineer           | Needs architectural decision |
| Done        | —                            | Merged and closed            |

**IDs (for GraphQL):**

- Project: `PVT_kwHODqX6Qs4BNUfu` | Status Field: `PVTSSF_lAHODqX6Qs4BNUfuzg8WaYA`
- Todo: `f75ad846` | In Progress: `47fc9ee4` | Verify: `5351d827` | Done: `98236657`

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
        code chat -r -m "Tech Lead" "You are Tech Lead 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
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
        code chat -r -m "Principal Engineer" "You are Principal Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
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
        code chat -r -m "Tech Lead" "You are Tech Lead 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
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
# PE respawning TL
code chat -r -m "Tech Lead" "You are Tech Lead 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."

# TL respawning PE
code chat -r -m "Principal Engineer" "You are Principal Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."

# TL spawning SE in worktree
.\scripts\spawn-worktree-agent.ps1
```

**⚠️ MODEL INHERITANCE WARNING:** The `code chat` command does NOT have a `--model` flag. The spawned agent inherits the model from the **current VS Code window**, NOT from the agent file's `model:` field. If PE is running Claude Opus 4.5 and respawns TL, the TL will also use Claude Opus 4.5 (ignoring `model: GPT 5.2 Codex` in tech-lead.agent.md).

**Agent File Model Field (Reference):**
Each agent file has a `model:` field in frontmatter (e.g., `model: GPT 5.2 Codex`). This field SHOULD be respected when selecting the agent via the VS Code UI, but is NOT respected by `code chat` CLI.

**To ensure correct model:**

1. **Preferred method:** Open a fresh VS Code window, select the correct model in the model picker FIRST, then use `/activate <Agent Name>` prompt
2. **Verify after spawn:** Ask "What model are you using?" in the first message
3. **If wrong model:** Close the window and restart with correct model selected

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

| Script                       | Purpose                         | Usage                       |
| ---------------------------- | ------------------------------- | --------------------------- |
| `check-rate-limits.ps1`      | GitHub API quota check          | Before expensive operations |
| `check-ci-status.ps1`        | Human-readable CI status        | Diagnose build failures     |
| `verify-merge.ps1`           | Post-merge verification         | After `gh pr merge`         |
| `add-board-item.ps1`         | Add issue to board with status  | Prevents limbo items        |
| `update-heartbeat.ps1`       | Update agent heartbeat          | Every 3 min in loop         |
| `read-heartbeat.ps1`         | Safe heartbeat reader           | Monitor other agents        |
| `spawn-worktree-agent.ps1`   | Spawn persistent SE in worktree | TL spawns SE once           |
| `cleanup-agent-branches.ps1` | Clean merged agent branches     | After several PRs merged    |
| `aeos-status.ps1`            | Full AEOS system status         | Debugging coordination      |

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

### Model Inheritance on Respawn

When using `code chat -r -m "Agent Name"` to respawn an agent, the new agent inherits the **current window's model**, NOT the model specified in the agent file's frontmatter.

**If wrong model is used:**

1. Close the incorrectly-spawned window
2. Open a fresh VS Code window
3. Select the correct model in Copilot settings
4. Then activate the agent manually via `/activate <Agent Name>`

## Reference

| Doc                                                               | Purpose          |
| ----------------------------------------------------------------- | ---------------- |
| [IDENTITY_SYSTEM.md](docs/aeos/IDENTITY_SYSTEM.md)                | Auth setup       |
| [TROUBLESHOOTING.md](docs/aeos/TROUBLESHOOTING.md)                | Recovery         |
| [CMC_GO_PATTERNS.md](.github/agents/reference/CMC_GO_PATTERNS.md) | Learned patterns |
