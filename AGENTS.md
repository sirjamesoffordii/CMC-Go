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
Principal Engineer (1 instance, continuous)
 └── Tech Lead (1 instance, continuous)
      └── Software Engineer (1 at a time, session-based, in worktree)
```

**Why this structure:**

- **Principal Engineer** maintains issue pipeline, respawns Tech Lead if stale
- **Tech Lead** coordinates work, spawns Software Engineer, reviews/merges PRs
- **Software Engineer** implements ONE issue in isolated worktree, then exits
- Only 1 Software Engineer at a time prevents merge conflicts

## Roles

| Role               | Account                  | Spawned By         | Purpose                       |
| ------------------ | ------------------------ | ------------------ | ----------------------------- |
| Principal Engineer | Principle-Engineer-Agent | Human              | Issues, priorities, oversight |
| Tech Lead          | Alpha-Tech-Lead          | Principal Engineer | Coordination, PR review       |
| Software Engineer  | Software-Engineer-Agent  | Tech Lead          | Implementation (worktree)     |

**Behavior files:** `.github/agents/{role}.agent.md`

## Board

**URL:** https://github.com/users/sirjamesoffordii/projects/4

| Status      | Owner                        | Action                               |
| ----------- | ---------------------------- | ------------------------------------ |
| Todo        | Tech Lead                    | Spawn Software Engineer to implement |
| In Progress | Software Engineer            | Being worked in worktree             |
| Verify      | Tech Lead/Principal Engineer | Review and merge PR                  |
| Blocked     | Principal Engineer           | Needs architectural decision         |
| Done        | —                            | Merged and closed                    |

**IDs (for GraphQL):**

- Project: `PVT_kwHODqX6Qs4BNUfu` | Status Field: `PVTSSF_lAHODqX6Qs4BNUfuzg8WaYA`
- Todo: `f75ad846` | In Progress: `47fc9ee4` | Verify: `5351d827` | Done: `98236657`

## Heartbeat

**File:** `.github/agents/heartbeat.json` (gitignored)

```json
{
  "PrincipalEngineer": { "ts": "2026-02-02T12:00:00Z", "status": "monitoring" },
  "TechLead": {
    "ts": "2026-02-02T12:00:00Z",
    "status": "reviewing-pr",
    "pr": 123
  },
  "SoftwareEngineer": {
    "ts": "2026-02-02T12:00:00Z",
    "status": "implementing",
    "issue": 42,
    "worktree": "wt-42"
  }
}
```

**Protocol:**

- Update every 3 min with current status
- Stale = no update in 6+ min → Principal Engineer respawns Tech Lead

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

## Spawning

```powershell
# Principal Engineer spawns Tech Lead (only 1 Tech Lead at a time)
code chat -r -m "Tech Lead" -a AGENTS.md "You are Tech Lead. You are fully autonomous. Don't ask questions. Loop forever. Start now."

# Tech Lead spawns Software Engineer via worktree script (only 1 Software Engineer at a time)
.\scripts\spawn-worktree-agent.ps1 -IssueNumber 42
```

**Rules:**

1. Principal Engineer spawns exactly 1 Tech Lead
2. Tech Lead spawns exactly 1 Software Engineer at a time using the worktree script
3. Tech Lead waits for Software Engineer to complete (PR merged) before spawning next Software Engineer

## Software Engineer Worktree Workflow

Software Engineer always works in an isolated worktree, never the main repo:

```powershell
# Worktree created by spawn script at:
C:\Dev\CMC-Go-Worktrees\wt-<issue>

# After PR merged, Tech Lead cleans up:
git worktree remove C:\Dev\CMC-Go-Worktrees\wt-<issue>
git branch -d agent/se/<issue>-<slug>

# Periodic cleanup (after several merges):
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
5. **Worktree isolation** — Software Engineer never works in main repo
6. **Check rate limits** — Before spawning or assigning, verify quota

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

| Concurrent Agents                                         | Expected GraphQL/hr | Safe?                 |
| --------------------------------------------------------- | ------------------- | --------------------- |
| 1 Principal Engineer + 1 Tech Lead + 1 Software Engineer  | ~500-1000           | ✅ Yes                |
| 1 Principal Engineer + 1 Tech Lead + 2 Software Engineers | ~1000-2000          | ⚠️ Monitor            |
| 1 Principal Engineer + 1 Tech Lead + 3 Software Engineers | ~1500-3000          | ⚠️ Monitor closely    |
| More than 3 Software Engineers                            | ~2000+              | ❌ Risk of rate limit |

**Note:** Model token limits (Claude Opus 4.5) are plan-dependent and not directly observable. If agents start failing with auth/quota errors, reduce concurrency.

## AEOS Self-Improvement

Agents can propose improvements to the autonomous workflow itself.

**Tracking Issue:** `[AEOS] Workflow Improvements` (pinned, stays open)

**Process:**

1. Any agent notices friction, inefficiency, or failure pattern
2. Tech Lead/Software Engineer add a **comment** to the tracking issue:
   - Format: `**<role> observation:** <problem> → <suggested fix>`
3. Principal Engineer reviews comments and promotes valid ones to checklist items:
   - `[ ] **<title>** — <problem> → <proposed fix>`
4. Principal Engineer checks existing items for conflicts/redundancy before adding
5. Human reviews tracking issue periodically:
   - Check item → approved for implementation
   - Delete item → rejected
   - Convert to Issue → needs dedicated work

**Who contributes what:**

| Role               | Perspective             | Example Observations             |
| ------------------ | ----------------------- | -------------------------------- |
| Principal Engineer | Architecture, oversight | Rate limits, agent coordination  |
| Tech Lead          | Coordination, PR flow   | Spawn issues, merge problems     |
| Software Engineer  | Implementation, tooling | Test setup, file edits, patterns |

**Where to review:** Single issue titled `[AEOS] Workflow Improvements`

## Reference

| Doc                                                               | Purpose          |
| ----------------------------------------------------------------- | ---------------- |
| [IDENTITY_SYSTEM.md](docs/aeos/IDENTITY_SYSTEM.md)                | Auth setup       |
| [TROUBLESHOOTING.md](docs/aeos/TROUBLESHOOTING.md)                | Recovery         |
| [CMC_GO_PATTERNS.md](.github/agents/reference/CMC_GO_PATTERNS.md) | Learned patterns |
