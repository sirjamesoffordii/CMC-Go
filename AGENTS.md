# CMC Go — Agent Manual

## Start

1. Auth: `$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-<account>"; gh auth status`
2. Heartbeat: Register in `.github/agents/heartbeat.json`
3. Board: `gh project item-list 4 --owner sirjamesoffordii --limit 10`
4. Execute your role

## Roles

| Role | Account                  | Model    | Instances | Purpose                                |
| ---- | ------------------------ | -------- | --------- | -------------------------------------- |
| PE   | Principle-Engineer-Agent | Opus 4.5 | 1         | Issue creation, priorities, TL respawn |
| TL   | Alpha-Tech-Lead          | Opus 4.5 | 1         | Coordination, SE spawning, merging     |
| SE   | Software-Engineer-Agent  | Opus 4.5 | 1         | Implementation (spawned by TL)         |

**Behavior:** `.github/agents/{role}.agent.md`

## Architecture

```
PE (continuous) — reviews repo/app, creates issues, monitors heartbeats
  └── TL (continuous) → spawns SE, reviews PRs, merges
        └── SE (session) → implements ONE issue at a time in worktree
```

**Constraints:**

- Only 1 SE active at a time (prevents workspace contention)
- SE MUST work in isolated worktree (never main repo)
- TL waits for SE completion before spawning next SE
- Main workspace reserved for PE/TL coordination only

## Board

**URL:** https://github.com/users/sirjamesoffordii/projects/4

| Status      | Meaning                       |
| ----------- | ----------------------------- |
| Draft       | TL-created, needs PE approval |
| Todo        | Ready, not claimed            |
| In Progress | Being worked                  |
| Blocked     | Needs decision                |
| Verify      | PR ready for review           |
| Done        | Merged                        |

**IDs:** Project `PVT_kwHODqX6Qs4BNUfu` | Status Field `PVTSSF_lAHODqX6Qs4BNUfuzg8WaYA`
Draft `687f4500` | Todo `f75ad846` | In Progress `47fc9ee4` | Blocked `652442a1` | Verify `5351d827` | Done `98236657`

**Priority Field ID:** `PVTSSF_lAHODqX6Qs4BNUfuzg8Wa5g`
High `542f2119` | Medium `b18a1ee4` | Low `e01e814a`

## Heartbeat

**File:** `.github/agents/heartbeat.json` (gitignored)

```json
{
  "core": ["PE", "TL"],
  "agents": {
    "PE": {
      "ts": "2026-01-28T12:00:00Z",
      "status": "reviewing",
      "issue": null
    },
    "TL": {
      "ts": "2026-01-28T12:00:00Z",
      "status": "waiting-for-se",
      "issue": null
    },
    "SE": {
      "ts": "2026-01-28T12:00:00Z",
      "status": "implementing",
      "issue": 42,
      "workspace": "C:/Dev/CMC-Go-Worktrees/wt-impl-42",
      "branch": "agent/se/42-fix-bug"
    }
  }
}
```

**Required Fields:**
| Field | Required | Description |
|-------|----------|-------------|
| ts | All | ISO-8601 timestamp |
| status | All | Current activity |
| issue | SE | Issue number being worked |
| workspace | SE | Absolute path to worktree (MUST NOT be main repo) |
| branch | SE | Git branch name |

**Protocol:**

- Every 3 min: Update your entry (timestamp + status)
- Before major actions: Check peers for staleness
- Core agents stale >6 min: Senior agent respawns (PE respawns TL)
- SE stale >6 min: TL deletes entry, issue returns to Todo
- **Pre-flight check:** SE must verify workspace is NOT main repo before any edits

## Spawning

```powershell
# PE spawns TL (only 1 TL at a time)
code chat -r -m "Tech Lead" -a AGENTS.md "You are TL. Start."

# TL spawns SE via worktree script (MANDATORY)
.\scripts\spawn-worktree-agent.ps1 -IssueNumber 42
```

**Rules:**

- PE spawns exactly 1 TL
- TL spawns exactly 1 SE at a time
- TL MUST use `spawn-worktree-agent.ps1` (never `code chat` directly)
- TL waits for SE to complete/fail before spawning next SE

**Hierarchy:** PE → TL → SE (PE spawns TL only, TL spawns SE only)

## Rules

1. **Heartbeat first** — Update before every loop iteration
2. **Board is truth** — Update status immediately
3. **Small diffs** — Optimize for reviewability
4. **Evidence in PRs** — Commands + results
5. **Never stop** — Loop until Done or Blocked
6. **SE MUST use worktree** — NEVER edit files in main repo
7. **One SE at a time** — TL waits for SE completion before spawning next
8. **Pre-flight check** — SE verifies worktree before ANY file edits

## Worktrees (SE Isolation)

SE **MUST** work in an isolated worktree. This is NON-NEGOTIABLE.

### TL Spawns SE (Preferred Method)

```powershell
# TL uses this script - it handles everything
.\scripts\spawn-worktree-agent.ps1 -IssueNumber 42
```

### Manual Worktree Creation

```powershell
# Create worktree for issue (run from main repo)
git fetch origin
git worktree add -b agent/se/<issue#>-<slug> C:/Dev/CMC-Go-Worktrees/wt-impl-<issue#> origin/staging

# Open worktree in new VS Code window
code C:/Dev/CMC-Go-Worktrees/wt-impl-<issue#>
```

### SE Pre-Flight Check (MANDATORY)

Before ANY file edits, SE must verify:

```powershell
# Verify NOT in main repo
$cwd = (Get-Location).Path
if ($cwd -eq "C:\Dev\CMC Go" -or $cwd -eq "C:/Dev/CMC Go") {
    Write-Error "ABORT: Cannot edit files in main repo. Use worktree."
    exit 1
}

# Verify workspace is in heartbeat
$hb = Get-Content ".github/agents/heartbeat.json" | ConvertFrom-Json
if ($hb.agents.SE.workspace -ne $cwd) {
    Write-Error "ABORT: Workspace mismatch. Update heartbeat first."
    exit 1
}
```

**Why worktrees?**

- Prevents file contention between agents
- Main repo stays clean for TL/PE coordination
- Each issue has isolated working directory
- Easy cleanup after PR merges

### Cleanup (TL does this after merge)

```powershell
git worktree remove C:/Dev/CMC-Go-Worktrees/wt-impl-<issue#>
git branch -d agent/se/<issue#>-<slug>
```

## Branch & Commit

- **Branch:** `agent/se/<issue#>-<slug>` (e.g., `agent/se/42-fix-bug`)
- **Commit:** `agent(se): <summary>` (e.g., `agent(se): Fix district filter`)

## Reference

| Doc                                                               | Purpose          |
| ----------------------------------------------------------------- | ---------------- |
| [IDENTITY_SYSTEM.md](docs/aeos/IDENTITY_SYSTEM.md)                | Auth setup       |
| [TROUBLESHOOTING.md](docs/aeos/TROUBLESHOOTING.md)                | Recovery         |
| [CMC_GO_PATTERNS.md](.github/agents/reference/CMC_GO_PATTERNS.md) | Learned patterns |
