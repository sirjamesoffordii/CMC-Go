# AEOS Project Board

How to use the CMC Go Project board. This is the **source of truth** for work status.

**Board URL:** https://github.com/users/sirjamesoffordii/projects/4

---

## Status Meanings

| Status          | Meaning                                 |
| --------------- | --------------------------------------- |
| **Todo**        | Ready to start, not claimed             |
| **In Progress** | Someone is actively working             |
| **Blocked**     | Waiting on external input/decision      |
| **Verify**      | Implementation done, needs verification |
| **Done**        | Verified and merged                     |

---

## Agent Responsibilities (non-negotiable)

**The board must always reflect reality. Update immediately.**

1. **Before starting:** Status → In Progress, assign yourself
2. **When blocked:** Status → Blocked, post A/B/C decision in Issue
3. **When done implementing:** Status → Verify, open PR
4. **After merge:** Status → Done

---

## Project Fields

| Field            | What to Set                       |
| ---------------- | --------------------------------- |
| **Status**       | Always keep current               |
| **Assignees**    | Who's working on it               |
| **Phase**        | Which milestone (1, 1.2, 2, 3, 4) |
| **Workstream**   | Area (Map, Panel, Server, etc.)   |
| **Verify Level** | L0/L1/L2                          |
| **Item Type**    | Epic, Task, Verification, PR      |

---

## CLI Commands

### Check Board State

```powershell
gh project item-list 4 --owner sirjamesoffordii --limit 10 --format json | ConvertFrom-Json | Select-Object -ExpandProperty items | Format-Table number, title, status
```

### Add Issue to Project

```powershell
gh project item-add 4 --owner sirjamesoffordii --url <issue-url>
```

### Update Status

```powershell
# Get field and option IDs first
gh project field-list 4 --owner sirjamesoffordii --format json

# Then update
gh project item-edit --project-id PVT_kwHODqX6Qs4BNUfu --id <item-id> --field-id PVTSSF_lAHODqX6Qs4BNUfuzg8WaYA --single-select-option-id <status-option-id>
```

**Status Option IDs:**

- Todo: `f75ad846`
- In Progress: `47fc9ee4`
- Verify: `5351d827`
- Done: `98236657`
- Blocked: `652442a1`

---

## Capacity Management

### TL Capacity: 4 Active Items

**Active items** = Issues with Status "In Progress" OR "Verify"

Before delegating new work:

```
Count: Issues where Status = "In Progress" OR "Verify"
If count >= 4 → spawn secondary TL OR wait
If count < 4 → delegate new work
```

### Stale Detection

**Note:** This is _task_ staleness (how long work should take), not _agent_ staleness. Agent heartbeat stale threshold is always **6 minutes** (see AGENTS.md).

| Complexity | Expected Max Time | If Exceeded |
| ---------- | ----------------- | ----------- |
| 1          | 3 min             | Investigate |
| 2          | 6 min             | Investigate |
| 3          | 9 min             | Investigate |
| 4          | 12 min            | Investigate |
| 5          | 15 min            | Investigate |
| 6          | 18 min            | Investigate |

**Recovery actions:**

- Still working → let continue
- Silent → re-assign to new agent
- Stuck on question → answer and re-delegate
- Session died → Blocked or back to Todo

---

## Cold Start (Empty Board)

If board has zero items:

```powershell
# Find work
grep -rn "TODO\|FIXME" --include="*.ts" --include="*.tsx" | head -50
pnpm check
pnpm test
gh run list --limit 5 --status failure
gh pr list --state open
```

Then create Issues with Goal/Scope/AC for each finding.
