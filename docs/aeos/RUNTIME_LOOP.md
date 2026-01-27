# AEOS Runtime Loop

> **Purpose:** Day-to-day agent execution — the continuous loop that delivers software.

---

## Overview

```
                    ┌─────────────────────────────────────┐
                    │         PE (Episodic)               │
                    │  Planning epochs, coherence checks  │
                    └──────────────┬──────────────────────┘
                                   │ spawns/monitors
                    ┌──────────────▼──────────────────────┐
                    │         TL (Continuous)             │
                    │  Coordinate → Delegate → Review     │
                    └──────────────┬──────────────────────┘
                                   │ delegates to
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
    ┌───────────┐            ┌───────────┐            ┌───────────┐
    │   SE-1    │            │   SE-2    │            │  Cloud    │
    │  (Local)  │            │  (Local)  │            │  Agents   │
    └─────┬─────┘            └─────┬─────┘            └─────┬─────┘
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   ▼
                    ┌──────────────────────────────────────┐
                    │              GitHub                   │
                    │  Issues → PRs → CI → Merge → Done    │
                    └──────────────────────────────────────┘
```

---

## PE Loop (Episodic)

PE runs in **planning bursts**, not continuously.

### When PE Activates

- System startup (boot AEOS)
- TL requests planning help
- Scheduled planning epoch
- Coherence drift detected

### PE Epoch Checklist

```markdown
1. Check TL heartbeat → spawn if missing
2. Board health: Are there enough executable Issues? (Target: 5-10)
3. Priority clarity: Is next most important work obvious?
4. Workstream coherence: Any conflicts between Issues?
5. Stale work: Any "In Progress" items with no updates > 60 min?
6. Architecture risks: Any drift from invariants?
```

### PE Output

Post **Planning Summary** to MCP Memory:

```
PE Planning Epoch — <timestamp>
- Board Health: [healthy / needs work]
- Issues Ready: N executable, M need refinement
- Priority: Next highest-value = Issue #X
- Actions Taken: Created Issue #Z, Refined Issue #W
```

---

## TL Loop (Continuous)

TL runs **continuously**, keeping execution flowing.

### TL Cycle (every ~5 min)

```
1. Post heartbeat to MCP Memory
2. Check SE heartbeats (are they alive?)
3. Poll board for state changes:
   - Blocked items → unblock or escalate
   - Verify items → review PR
   - Todo items → delegate to SE
4. Review open PRs → approve/request changes/merge
5. Handle SE questions (via Issue comments)
6. Loop
```

### TL Delegation Decision Tree

```
Is there a Todo item?
├── YES: What's the complexity score?
│   ├── 0-1: Trivial → delegate to SE anyway (TL never edits code)
│   ├── 0-2: Simple async → Cloud Agent (agent:copilot-SE label)
│   └── 2-6: Standard/Complex → Local SE (code chat -n)
└── NO: Board empty?
    ├── YES: Ask PE to run planning epoch
    └── NO: All items In Progress → monitor, review PRs
```

### TL Capacity

- **Max 4 active items** per TL instance
- Active = Status "In Progress" OR "Verify"
- If capacity full → spawn secondary TL OR wait

---

## SE Loop (Continuous)

SE runs **continuously**, pulling and completing work.

### SE Cycle

```
1. Post heartbeat to MCP Memory
2. Check board for work:
   └── Status = "Todo" → claim highest priority
3. Claim work:
   - Set Status → "In Progress"
   - Assign self
   - Post claim comment
4. Create worktree:
   └── wt-impl-<issue#>-<slug>
5. Implement:
   - Smallest diff that solves the issue
   - Run checks: pnpm check && pnpm test
6. Open PR:
   - Evidence of verification
   - Link to Issue
7. Set Status → "Verify"
8. Wait for review → address feedback → merge
9. Set Status → "Done"
10. Loop to step 1
```

### SE Circuit Breaker

**Task-level:** After 3 consecutive failures on same task:

- Set Status → Blocked
- Post failure summary
- Move to next item

**Session-level:** After 10 total failures:

- Post session summary
- Stop and await review

---

## Heartbeat Protocol

All agents post heartbeats to MCP Memory:

| Agent | Interval | Stale Threshold | Format                                       |
| ----- | -------- | --------------- | -------------------------------------------- |
| PE    | 3 min    | 6 min           | `heartbeat: TIMESTAMP \| STATUS`             |
| TL    | 3 min    | 6 min           | `heartbeat: TIMESTAMP \| STATUS`             |
| SE    | 3 min    | 6 min           | `heartbeat: TIMESTAMP \| Issue #N \| STATUS` |

### Heartbeat MCP Command

```javascript
mcp_memory_add_observations({
  entityName: "SE-1",
  contents: ["heartbeat: 2026-01-26T14:30:00Z | Issue #42 | working"],
});
```

### Stale Detection

TL monitors SE heartbeats. PE monitors TL heartbeat.

If heartbeat missing > threshold:

1. Check if agent still producing output
2. Check Issue comments for activity
3. If truly stale → spawn replacement

### Orphaned Work Recovery

**Orphaned work** = Issue is "In Progress" but the assigned agent is gone (no heartbeat, no VS Code session).

**Detection (during PE planning epoch or TL cycle):**

```
For each "In Progress" issue:
  1. Check MCP Memory for agent heartbeat
  2. If heartbeat > 60 min stale OR no heartbeat:
     - Check GitHub for recent activity (comments, commits)
     - Check if PR exists
  3. If no activity in 60 min → issue is orphaned
```

**Recovery procedure:**

1. **Check for partial work:**

   ```powershell
   # Check for local worktree
   Get-ChildItem "C:\Dev\CMC Go" -Directory | Where-Object { $_.Name -like "wt-impl-<issue#>*" }

   # Check for unpushed branch
   git -C "wt-impl-<issue#>-*" log --oneline origin/staging..HEAD
   ```

2. **If work exists (worktree, branch, or PR):**
   - Spawn new SE to continue: `code chat -n -m "Software Engineer" "Continue Issue #<N>. Check worktree wt-impl-<N>-*."`
   - New SE adopts the existing worktree/branch

3. **If no work exists:**
   - Move issue back to "Todo"
   - Remove assignee
   - Post comment: `ORPHAN-RECOVERED: No work found. Returning to Todo.`

4. **Update MCP Memory:**
   - Clear stale agent observations
   - Update agent status to "idle"

---

## Project Board Workflow

The **CMC Go Project** (Project 4) is the source of truth.

### Status Flow

```
Todo → In Progress → Verify → Done
         ↓
      Blocked (if stuck)
```

### Required Actions by Status

| Status      | Who Sets | Next Action                         |
| ----------- | -------- | ----------------------------------- |
| Todo        | PE/TL    | SE claims, sets → In Progress       |
| In Progress | SE       | SE implements, sets → Verify        |
| Verify      | SE       | TL reviews PR, sets → Done          |
| Blocked     | SE/TL    | Resolve blocker, sets → In Progress |
| Done        | TL       | Nothing (complete)                  |

### Update Commands

```powershell
# View project items
gh project item-list 4 --owner sirjamesoffordii --format json

# Add issue to project
gh project item-add 4 --owner sirjamesoffordii --url <issue-url>

# Update status (requires item-id and option-id)
gh project item-edit --project-id PVT_kwHODqX6Qs4BNUfu --id <item-id> --field-id PVTSSF_lAHODqX6Qs4BNUfuzg8WaYA --single-select-option-id <status-option-id>
```

Status option IDs:

- Todo: `f75ad846`
- In Progress: `47fc9ee4`
- Verify: `5351d827`
- Done: `98236657`
- Blocked: `652442a1`

---

## PR Lifecycle

### Open PR

```powershell
# From worktree branch
gh pr create --title "agent(se): <summary>" --body "..." --base staging
```

### PR Description (minimum)

```markdown
## Why

Closes #<issue>

## What Changed

- Bullet points

## How Verified

- `pnpm check` — passed
- `pnpm test` — N tests passed

## Risk

Low — <rationale>

## End-of-Task Reflection

- **Workflow:** No changes
- **Patterns:** No changes
```

### Review & Merge

TL reviews:

1. Evidence present?
2. Tests pass (CI green)?
3. Scope matches Issue?

If yes → Squash merge → Delete branch → Set Status → Done

---

## Communication Patterns

### SE → TL (via GitHub)

SE posts these markers as Issue comments:

| Marker                            | Meaning          | TL Action           |
| --------------------------------- | ---------------- | ------------------- |
| `SE-CLAIMED: Issue #X`            | Working on it    | Track on board      |
| `SE-BLOCKED: Issue #X - <reason>` | Needs help       | Unblock or escalate |
| `SE-COMPLETE: Issue #X, PR #Y`    | Ready for review | Review PR           |
| `SE-IDLE: No work found`          | Board empty      | Create more work    |

### TL → PE (via MCP Memory)

TL updates observations on Agent entities. PE reads MCP Memory during planning epochs.

### Escalation (to Human)

Only escalate when:

- Security-sensitive choice
- Destructive/irreversible action
- Changes repo invariants

Use A/B/C format in Issue comment:

```markdown
**Status:** Blocked
**Decision needed:** <one sentence>
**Options:**

- A) ...
- B) ...
- C) ...
  **Recommended default (if no response by <time>):** A
```

---

## Verification Levels

PRs require verification based on risk:

| Label       | Requirement                    | Who                  |
| ----------- | ------------------------------ | -------------------- |
| `verify:v0` | Author self-verifies           | SE                   |
| `verify:v1` | Someone else verifies          | TL or other SE       |
| `verify:v2` | Peer verifies + extra evidence | TL + evidence labels |

Evidence labels:

- `evidence:db-or-ci` — Database or CI evidence
- `evidence:deployed-smoke` — Deployed smoke test
