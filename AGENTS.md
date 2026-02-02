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
PE (1 instance, continuous)
 └── TL (1 instance, continuous)
      └── SE (1 at a time, session-based, in worktree)
```

**Why this structure:**

- **PE** maintains issue pipeline, respawns TL if stale
- **TL** coordinates work, spawns SE, reviews/merges PRs
- **SE** implements ONE issue in isolated worktree, then exits
- Only 1 SE at a time prevents merge conflicts

## Roles

| Role | Account                  | Spawned By | Purpose                       |
| ---- | ------------------------ | ---------- | ----------------------------- |
| PE   | Principle-Engineer-Agent | Human      | Issues, priorities, oversight |
| TL   | Alpha-Tech-Lead          | PE         | Coordination, PR review       |
| SE   | Software-Engineer-Agent  | TL         | Implementation (worktree)     |

**Behavior files:** `.github/agents/{role}.agent.md`

## Board

**URL:** https://github.com/users/sirjamesoffordii/projects/4

| Status      | Owner | Action                       |
| ----------- | ----- | ---------------------------- |
| Todo        | TL    | Spawn SE to implement        |
| In Progress | SE    | Being worked in worktree     |
| Verify      | TL/PE | Review and merge PR          |
| Blocked     | PE    | Needs architectural decision |
| Done        | —     | Merged and closed            |

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
    "worktree": "wt-42"
  }
}
```

**Protocol:**

- Update every 3 min with current status
- Stale = no update in 6+ min → PE respawns TL

## Spawning

```powershell
# PE spawns TL (only 1 TL at a time)
code chat -r -m "Tech Lead" -a AGENTS.md "You are TL. Start."

# TL spawns SE via worktree script (only 1 SE at a time)
.\scripts\spawn-worktree-agent.ps1 -IssueNumber 42
```

**Rules:**

1. PE spawns exactly 1 TL
2. TL spawns exactly 1 SE at a time using the worktree script
3. TL waits for SE to complete (PR merged) before spawning next SE

## SE Worktree Workflow

SE always works in an isolated worktree, never the main repo:

```powershell
# Worktree created by spawn script at:
C:\Dev\CMC-Go-Worktrees\wt-<issue>

# After PR merged, TL cleans up:
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
5. **Worktree isolation** — SE never works in main repo

## AEOS Self-Improvement

Agents can propose improvements to the autonomous workflow itself.

**Tracking Issue:** `[AEOS] Workflow Improvements` (pinned, stays open)

**Process:**

1. Any agent notices friction, inefficiency, or failure pattern
2. PE adds a checklist item to the tracking issue with:
   - `[ ] **<title>** — <problem> → <proposed fix>`
3. PE checks existing items for conflicts/redundancy before adding
4. Human reviews tracking issue periodically:
   - Check item → approved for implementation
   - Delete item → rejected
   - Convert to Issue → needs dedicated work

**Where to review:** Single issue titled `[AEOS] Workflow Improvements`

**Example checklist items:**

- `[ ] **Rate limit fallback** — GraphQL quota exhausted → add REST API fallback`
- `[ ] **Heartbeat contention** — concurrent writes fail → add file locking`
- `[ ] **Spawn validation** — SE starts in wrong dir → add pre-flight check`

## Reference

| Doc                                                               | Purpose          |
| ----------------------------------------------------------------- | ---------------- |
| [IDENTITY_SYSTEM.md](docs/aeos/IDENTITY_SYSTEM.md)                | Auth setup       |
| [TROUBLESHOOTING.md](docs/aeos/TROUBLESHOOTING.md)                | Recovery         |
| [CMC_GO_PATTERNS.md](.github/agents/reference/CMC_GO_PATTERNS.md) | Learned patterns |
