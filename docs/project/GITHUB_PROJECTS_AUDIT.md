# GitHub Projects Feature Audit — CMC Go

**Project:** CMC Go v1.0 Roadmap (Project #4)  
**Date:** Auto-generated audit  
**Status:** ✅ Well-utilized with room for improvements

---

## Executive Summary

| Category              | Score      | Notes                                                   |
| --------------------- | ---------- | ------------------------------------------------------- |
| **Fields & Metadata** | ⭐⭐⭐⭐⭐ | Excellent - Status, Priority, Workstream all configured |
| **Automations**       | ⭐⭐⭐⭐⭐ | All 11 built-in workflows enabled                       |
| **Views**             | ⭐⭐⭐☆☆   | Only 2 generic views - missing focused views            |
| **Milestones**        | ⭐⭐⭐⭐☆  | 5 milestones defined, but not linked to board view      |
| **Epics/Sub-issues**  | ⭐⭐⭐⭐☆  | Using parent/child relationships, good structure        |
| **Iterations**        | ⭐☆☆☆☆     | Not configured (sprints not used)                       |
| **Labels**            | ⭐⭐⭐⭐⭐ | Rich labeling system with agent, priority, phase labels |

---

## What We ARE Using

### ✅ Status Field (10 options)

| Status           | Purpose                           | AEOS Usage                    |
| ---------------- | --------------------------------- | ----------------------------- |
| Blocked          | Awaiting decision/dependency      | PE reviews                    |
| Exploratory      | Ideas for user to check           | User checks, PE creates Todos |
| Draft (TL)       | TL suggestions for PE approval    | PE → Todo or reject           |
| Todo             | Ready for implementation          | TL assigns to SE              |
| In Progress      | Being worked on                   | SE implements                 |
| Verify           | PR submitted, needs review        | TL/PE reviews                 |
| UI/UX. Review    | Visual changes need user approval | User approves                 |
| Done             | Completed                         | Archived after 14 days        |
| Health Check     | System health monitoring          | Agent tasks                   |
| AEOS Improvement | Agent system improvements         | PE monitors                   |

### ✅ Custom Fields

- **Priority**: Urgent, High, Medium, Low
- **Workstream**: Map, Panel, Server, Follow-Up, Infrastructure

### ✅ Built-in Fields

- Title, Assignees, Labels, Linked PRs, Milestone, Repository
- Reviewers, Parent issue, Sub-issues progress

### ✅ All 11 Automations Enabled

| Automation                     | Status | What it does                       |
| ------------------------------ | ------ | ---------------------------------- |
| Auto-add sub-issues to project | ✅     | When parent added, children follow |
| Auto-add to project            | ✅     | New issues auto-added              |
| Auto-archive items             | ✅     | Done items archived after period   |
| Auto-close issue               | ✅     | Issues closed when PR merges       |
| Code changes requested         | ✅     | Status update on review            |
| Code review approved           | ✅     | Status update on approval          |
| Item added to project          | ✅     | Trigger on add                     |
| Item closed                    | ✅     | Status → Done                      |
| Item reopened                  | ✅     | Reset status                       |
| Pull request linked to issue   | ✅     | Track PR linkage                   |
| Pull request merged            | ✅     | Final status update                |

### ✅ Milestones (5 defined)

| Milestone                    | Description                    | Open | Closed |
| ---------------------------- | ------------------------------ | ---- | ------ |
| v1.0: Core System Integrity  | Foundation                     | 0    | 0      |
| v1.1: Cross-View Consistency | Map, panel, follow-up sync     | 0    | 3      |
| v1.2: Desktop UX             | Navigation, filters, panel     | 0    | 12     |
| v1.3: Authentication         | Login, sessions, roles         | 0    | 9      |
| v1.4: Mobile                 | Responsive, touch optimization | 0    | 10     |

### ✅ Epics with Sub-issues

| Epic                                         | Status | Child Issues     |
| -------------------------------------------- | ------ | ---------------- |
| Epic: Phase 1 Core System Integrity          | Closed | Multiple         |
| Epic: Phase 1.2 Cross-View Consistency       | Closed | Multiple         |
| Epic: Phase 2 Desktop UX & Navigation        | Closed | Multiple         |
| Epic: Phase 3 Authentication & Authorization | Closed | #117, #121, etc. |
| Epic: Phase 4 Mobile Optimization            | Closed | #125-#129, etc.  |
| Epic: Test Coverage Expansion                | Closed | Multiple         |
| Epic: People Visibility & Access Control     | Closed | Multiple         |

### ✅ Labels (Rich System)

- **Agent labels**: `agent:copilot`, `agent:copilot-swe`, `agent:copilot-tl`
- **Priority labels**: `priority:high`, `priority:medium`, `priority:low`
- **Phase labels**: `phase:1`, `phase:1.2`, `phase:2`, `phase:3`, `phase:4`
- **Type labels**: `bug`, `enhancement`, `documentation`, `epic`
- **Evidence labels**: `evidence:db-or-ci`, `evidence:deployed-smoke`
- **Role labels**: `role:browser`, `role:builder`

---

## What We're NOT Using (Opportunities)

### ❌ Iterations (Sprints)

**What it is:** Time-boxed periods like 2-week sprints with start/end dates.

**Why we might not need it:**

- AEOS operates continuously, not in sprints
- Work is assigned one issue at a time
- Milestones serve a similar grouping purpose

**Recommendation:** ⏭️ **Skip** — Doesn't fit continuous agent workflow.

### ⚠️ Roadmap View

**What it is:** Timeline/Gantt-style view showing items by date/iteration.

**Current state:** Only Table and Board views configured.

**Recommendation:** ✅ **Add** — Create "Roadmap" view grouped by Milestone for high-level planning visibility.

### ⚠️ Focused Views

**What it is:** Saved views with specific filters/sorts.

**Current state:** Only generic "View 1" (Table) and "View 2" (Board).

**Recommendations:**
| View Name | Type | Filter | Purpose |
|-----------|------|--------|---------|
| "Active Work" | Board | Status != Done | Hide completed items |
| "Agent Queue" | Table | Status = Todo + Priority sort | SE picks from this |
| "Blocked Review" | Table | Status = Blocked | PE reviews these |
| "By Workstream" | Board | Group by Workstream | Feature area focus |
| "By Milestone" | Table | Group by Milestone | Release planning |

### ⚠️ Column Limits (WIP Limits)

**What it is:** Max items allowed per board column.

**Current state:** Not configured.

**Recommendation:** ✅ **Add** — Set "In Progress" limit to 1-2 (matches AEOS one-at-a-time model).

### ⚠️ Due Dates on Milestones

**What it is:** Target completion dates for milestones.

**Current state:** All 5 milestones have `due_on: null`.

**Recommendation:** ✅ **Add** — Set target dates for release planning.

### ⚠️ Milestone Progress Visibility

**What it is:** View showing completion % per milestone.

**Current state:** Milestones exist but aren't prominently surfaced in board views.

**Recommendation:** ✅ **Add** — Create "Milestone Progress" table view grouped by Milestone showing open/closed counts.

### ⚠️ Insights/Charts

**What it is:** Built-in analytics like burndown, throughput, cycle time.

**Current state:** Not being reviewed/used by agents.

**Recommendation:** 🔄 **Consider** — PE could include insights check in monitoring loop.

---

## TL Blocking Workflow (NEW)

### Problem Statement

Tech Lead needs ability to:

1. Block issues that are too big in scope
2. Block issues that conflict with other work
3. Block issues that are stale or not beneficial
4. Provide recommendation for Principal Engineer review

### Proposed Workflow

```
TL detects problematic issue
    ↓
TL moves issue to "Blocked" status
    ↓
TL adds comment with structured recommendation:
    • Block Reason: [scope|conflict|stale|not-beneficial]
    • Details: <explanation>
    • Recommendation: <what PE should do>
    ↓
PE reviews Blocked items (part of core loop)
    ↓
PE either:
    (a) ACCEPTS: Creates smaller issues, closes original
    (b) DECLINES: Moves back to Todo with clarification
    (c) ARCHIVES: Closes as won't-do
```

### Comment Template for TL

```markdown
## 🚫 Blocked by Tech Lead

**Reason:** [Scope Too Large | Conflicts With Other Work | Stale | Not Beneficial]

**Details:**
<explanation of why this issue is problematic>

**Recommendation:**
<what PE should do - e.g., "Break into 3 smaller issues: X, Y, Z" or "Close as superseded by #123">

**Blocked at:** <timestamp>
**Blocked by:** @Tech-Lead-Agent
```

### Board Status Clarification

| Status      | Who Moves Here     | Who Reviews | Resolution                           |
| ----------- | ------------------ | ----------- | ------------------------------------ |
| Blocked     | TL (with comment)  | PE          | PE accepts/declines/archives         |
| Exploratory | PE (checkbox list) | User        | User checks items → PE creates Todos |
| Draft (TL)  | TL (suggestions)   | PE          | PE approves → Todo, or rejects       |

---

## Recommendations Summary

### High Priority (Do Now)

| #   | Action                            | Effort | Impact                             |
| --- | --------------------------------- | ------ | ---------------------------------- |
| 1   | **Add "Active Work" board view**  | 5 min  | Hide 173 Done items from main view |
| 2   | **Add WIP limit on In Progress**  | 2 min  | Enforce AEOS one-at-a-time model   |
| 3   | **Document TL blocking workflow** | 30 min | Add to AGENTS.md                   |
| 4   | **Create "Blocked Review" view**  | 5 min  | PE monitors blocked items          |

### Medium Priority (This Week)

| #   | Action                                | Effort | Impact                      |
| --- | ------------------------------------- | ------ | --------------------------- |
| 5   | **Add due dates to milestones**       | 10 min | Release planning visibility |
| 6   | **Create "By Milestone" view**        | 5 min  | Progress tracking           |
| 7   | **Add helper script for TL blocking** | 30 min | `block-issue.ps1`           |

### Low Priority (Consider)

| #   | Action                  | Effort  | Impact                |
| --- | ----------------------- | ------- | --------------------- |
| 8   | **Add Roadmap view**    | 10 min  | High-level timeline   |
| 9   | **PE reviews Insights** | Ongoing | Data-driven decisions |

---

## Current Board Stats

| Status      | Count |
| ----------- | ----- |
| Done        | 173   |
| In Progress | 6     |
| Todo        | 6     |
| Other       | TBD   |

**Total items:** 185+

---

## Appendix: GraphQL IDs for Automation Scripts

| Entity         | ID                               |
| -------------- | -------------------------------- |
| Project        | `PVT_kwHODqX6Qs4BNUfu`           |
| Status Field   | `PVTSSF_lAHODqX6Qs4BNUfuzg8WaYA` |
| View 1 (Table) | `PVTV_lAHODqX6Qs4BNUfuzgJHrjk`   |
| View 2 (Board) | `PVTV_lAHODqX6Qs4BNUfuzgJHr3w`   |

### Status Option IDs

| Status      | ID         |
| ----------- | ---------- |
| Todo        | `f75ad846` |
| In Progress | `47fc9ee4` |
| Verify      | `5351d827` |
| Done        | `98236657` |

---

_Generated by Principal Engineer audit process_
