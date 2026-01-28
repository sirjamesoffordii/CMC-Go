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
| TL   | Alpha-Tech-Lead          | Opus 4.5 | 2         | Coordination, SE spawning, merging     |
| SE   | Software-Engineer-Agent  | Opus 4.5 | N         | Implementation (spawned by TL)         |

**Behavior:** `.github/agents/{role}.agent.md`

## Architecture

```
PE (continuous) — reviews repo/app, creates issues, monitors heartbeats
  ├── TL-1 (continuous) → spawns SE sessions, reviews PRs
  └── TL-2 (continuous) → spawns SE sessions, reviews PRs
        ├── SE-1 (session) → implements issues
        └── SE-2 (session) → implements issues
```

- All agents are standalone sessions (`code chat -r`)
- All agents self-register in heartbeat file
- Any TL or PE can review PRs

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
  "core": ["PE-1", "TL-1", "TL-2"],
  "agents": {
    "PE-1": {
      "ts": "2026-01-28T12:00:00Z",
      "status": "reviewing",
      "issue": null
    },
    "TL-1": {
      "ts": "2026-01-28T12:00:00Z",
      "status": "delegating",
      "issue": 42
    }
  }
}
```

**Protocol:**

- Every 3 min: Update your entry (timestamp + status)
- Before major actions: Check peers for staleness
- Core agents stale >6 min: Senior agent respawns (PE respawns TL)
- Non-core (SE-\*) stale: Delete entry, no respawn needed

## Spawning

```powershell
# PE spawns TLs
code chat -r -m "Tech Lead" -a AGENTS.md "You are TL-1. Start."
code chat -r -m "Tech Lead" -a AGENTS.md "You are TL-2. Start."

# TL spawns SEs
code chat -r -m "Software Engineer" -a AGENTS.md "You are SE-1. Implement Issue #42. Start."
```

**Hierarchy:** PE → TL → SE (PE spawns TL only, TL spawns SE only)

## Rules

1. **Heartbeat first** — Update before every loop iteration
2. **Board is truth** — Update status immediately
3. **Small diffs** — Optimize for reviewability
4. **Evidence in PRs** — Commands + results
5. **Never stop** — Loop until Done or Blocked

## Branch & Commit

- **Branch:** `agent/se/<issue#>-<slug>` (e.g., `agent/se/42-fix-bug`)
- **Commit:** `agent(se): <summary>` (e.g., `agent(se): Fix district filter`)

## Reference

| Doc                                                               | Purpose          |
| ----------------------------------------------------------------- | ---------------- |
| [IDENTITY_SYSTEM.md](docs/aeos/IDENTITY_SYSTEM.md)                | Auth setup       |
| [TROUBLESHOOTING.md](docs/aeos/TROUBLESHOOTING.md)                | Recovery         |
| [CMC_GO_PATTERNS.md](.github/agents/reference/CMC_GO_PATTERNS.md) | Learned patterns |
