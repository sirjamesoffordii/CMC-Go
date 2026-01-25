# Workflow Health & Continuous Improvement

## Purpose

This document defines what "fully autonomous" means for CMC Go, identifies blockers to autonomy, and establishes a testing iteration loop for continuous workflow improvement.

---

## Part 1: Definition of "Fully Autonomous"

### What "Fully Autonomous" Means

**Fully autonomous** = Agents can execute the complete development lifecycle without human intervention, from understanding a requirement to delivering verified, deployed code.

#### Required Capabilities (Checklist)

| Capability                        | Status | Notes                                         |
| --------------------------------- | ------ | --------------------------------------------- |
| Read and understand Issues        | ✅     | Via GitHub API, fetch context                 |
| Create executable Issues          | ✅     | TL can structure Goal/Scope/AC                |
| Implement code changes            | ✅     | SWE in worktrees                              |
| Run verification commands         | ✅     | `pnpm check`, `pnpm test`, `pnpm e2e`         |
| Open and manage PRs               | ✅     | Via `gh` CLI                                  |
| Merge PRs                         | ⚠️     | Requires approval (human or TL)               |
| Deploy to staging                 | ⚠️     | Railway auto-deploys, but secrets may block   |
| Deploy to production              | ❌     | Human approval required (by design)           |
| Monitor post-deploy               | ⚠️     | Sentry/Railway logs accessible but noisy      |
| Handle 2FA/secrets                | ❌     | Human must provide credentials                |
| Make architectural decisions      | ⚠️     | TL can propose, human should approve big ones |
| Recover from environment failures | ⚠️     | Most recoverable, some require human          |

#### Autonomy Levels

| Level  | Description                                     | Human Intervention Required           |
| ------ | ----------------------------------------------- | ------------------------------------- |
| L0     | Fully manual — human does everything            | Every step                            |
| L1     | Assisted — agent helps but human drives         | Most steps                            |
| L2     | Semi-autonomous — agent executes, human reviews | PRs, deploys, decisions               |
| **L3** | **Mostly autonomous — agent handles routine**   | **Secrets, prod deploy, escalations** |
| L4     | Fully autonomous — agent handles everything     | None (not recommended)                |

**Current state:** L2-L3 (semi to mostly autonomous)
**Target state:** L3 (mostly autonomous with defined escalation paths)

---

## Part 2: Blockers to Full Autonomy

### Critical Blockers (Human Required)

| Blocker                     | Why It's Blocking                      | Potential Solution                                      |
| --------------------------- | -------------------------------------- | ------------------------------------------------------- |
| **Secrets/2FA**             | Agents cannot authenticate to services | Pre-provision tokens in GitHub Secrets; rotate manually |
| **Production deploys**      | Safety-critical, irreversible          | Keep human approval (intentional gate)                  |
| **Architectural decisions** | High impact, need business context     | TL proposes A/B/C, human approves via Issue comment     |
| **PR approval (staging)**   | Review bottleneck                      | TL can approve SWE PRs; human spot-checks weekly        |

### Recoverable Blockers (Agent Can Handle)

| Blocker                | Current Behavior        | Recovery Path                                     |
| ---------------------- | ----------------------- | ------------------------------------------------- |
| Terminal hangs/pagers  | Agent escalates         | Use `Agent: Recover terminal` task, then retry    |
| Flaky tests            | Agent retries once      | Increase retry count; add to patterns if systemic |
| Network timeouts       | Agent waits, then fails | Retry with backoff; poll CI for async results     |
| Git conflicts          | Agent escalates         | Fetch, rebase, resolve or escalate if complex     |
| Missing context        | Agent asks TL           | TL provides via Issue comment; SWE continues      |
| Schema migration fails | Agent stops             | Rollback script; document in patterns             |

### Proposed Solutions for Critical Blockers

#### 1. Secrets Management

```
Current: Human provides secrets when asked
Proposed:
  - Pre-create long-lived service tokens stored in GitHub Secrets
  - Agent reads from secrets, never from chat
  - Human rotates tokens quarterly (calendar reminder)
```

#### 2. PR Approval Bottleneck

```
Current: Human must approve all PRs
Proposed:
  - TL approves L0/L1 verification (self-verified) PRs
  - Human approves L2 (peer verification) PRs
  - Auto-merge to staging if CI passes + TL approved
  - Human gates production only
```

#### 3. Architectural Decisions

```
Current: Agent asks and waits
Proposed:
  - TL posts A/B/C decision with 24-hour timeout
  - If no response, TL picks recommended default
  - Human can override via Issue comment
```

---

## Part 3: Testing Iteration Loop

### The Meta-Loop: Continuous Workflow Improvement

```
┌─────────────────────────────────────────────────────────────┐
│                    WORKFLOW ITERATION LOOP                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│   │ EXECUTE  │───▶│ REFLECT  │───▶│ IMPROVE  │             │
│   │  Tasks   │    │  On Pain │    │   Docs   │             │
│   └──────────┘    └──────────┘    └──────────┘             │
│        │                               │                    │
│        │         ┌──────────┐          │                    │
│        └────────▶│  AUDIT   │◀─────────┘                    │
│                  │ Weekly   │                               │
│                  └──────────┘                               │
│                       │                                     │
│                       ▼                                     │
│                ┌──────────────┐                             │
│                │ MEASURE      │                             │
│                │ Health Score │                             │
│                └──────────────┘                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Phase 1: EXECUTE (Every Task)

Agents execute normal work. **During execution, track friction:**

| Friction Type           | Signal                                   | How to Detect                         |
| ----------------------- | ---------------------------------------- | ------------------------------------- |
| **Documentation gap**   | Had to figure out something undocumented | Agent spent >5 min researching        |
| **Tool failure**        | Terminal hang, command error, MCP issue  | Exit code ≠ 0, no output for 60s      |
| **Workflow confusion**  | Unclear which mode/process to use        | Agent asked TL for clarification      |
| **Blocking dependency** | Waited for human/external input          | Status = Blocked for >10 min          |
| **Repeated mistake**    | Same error occurred in multiple sessions | Error message matches CMC_GO_PATTERNS |

### Phase 2: REFLECT (End of Every Task)

**Already exists** in current workflow as "End-of-Task Reflection." Enhance with:

```markdown
## End-of-Task Reflection (Enhanced)

- **Workflow:** No changes / [file] — [change]
- **Patterns:** No changes / [file] — [change]
- **Friction score:** 0-5 (0 = smooth, 5 = painful)
  - 0: No issues, flowed naturally
  - 1: Minor lookup needed (<2 min)
  - 2: Had to consult docs (2-5 min)
  - 3: Had to experiment/debug (5-15 min)
  - 4: Blocked, needed help or workaround (15-30 min)
  - 5: Failed, required escalation or gave up
```

**New field: Friction score** — This becomes the raw data for workflow health metrics.

### Phase 3: IMPROVE (During Task)

**When to improve during a task:**

- Friction score ≥ 3 on something fixable
- Same friction encountered twice in a session
- Clear documentation gap identified

**How to improve:**

1. **Immediate fix:** Edit the doc as part of your PR
2. **Future fix:** Create an Issue tagged `workflow-improvement`
3. **Pattern capture:** Add to CMC_GO_PATTERNS.md

### Phase 4: AUDIT (Weekly)

**Tech Lead runs a weekly workflow audit** (triggered by calendar or when starting a new week's session).

#### Weekly Audit Checklist

```markdown
## Weekly Workflow Audit — [Date]

### 1. Friction Analysis

- Total tasks completed: \_\_\_
- Average friction score: \_\_\_
- Tasks with friction ≥ 3: \_\_\_ (list issues/PRs)
- Most common friction cause: \_\_\_

### 2. Pattern Review

- New patterns added this week: \_\_\_
- Patterns used to avoid issues: \_\_\_
- Patterns that are outdated: \_\_\_

### 3. Blocker Analysis

- Total blocked time: \_\_\_ hours
- Blockers by category:
  - Secrets/auth: \_\_\_
  - Human approval: \_\_\_
  - External service: \_\_\_
  - Unclear requirements: \_\_\_
- Preventable blockers: \_\_\_ (%)

### 4. Tool Health

- Terminal recovery needed: \_\_\_ times
- MCP server issues: \_\_\_ times
- GitHub API failures: \_\_\_ times
- CI failures (non-code): \_\_\_ times

### 5. Workflow Improvements Made

- Docs edited: \_\_\_
- Patterns added: \_\_\_
- Tasks/scripts created: \_\_\_

### 6. Recommendations

- [ ] [Improvement 1]
- [ ] [Improvement 2]
- [ ] [Improvement 3]
```

### Phase 5: MEASURE (Health Score)

See Part 4 for the full health metric system.

---

## Part 4: Workflow Health Metrics

### Primary Health Score (0-100)

**Formula:**

```
Health Score = (
  (1 - avg_friction/5) × 40 +           # Smoothness (40 pts max)
  (tasks_completed / tasks_started) × 30 + # Completion rate (30 pts max)
  (1 - blocked_time / total_time) × 20 +   # Autonomy (20 pts max)
  (improvements_made / friction_events) × 10  # Learning rate (10 pts max)
)
```

### Health Score Interpretation

| Score  | Status     | Action                                       |
| ------ | ---------- | -------------------------------------------- |
| 90-100 | Excellent  | Document what's working; look for polish     |
| 75-89  | Good       | Address friction ≥ 3 items                   |
| 60-74  | Fair       | Review patterns; schedule improvement sprint |
| 40-59  | Concerning | Pause feature work; fix workflow issues      |
| 0-39   | Critical   | Stop and fully audit before proceeding       |

### Signals That Workflow Is Working

| Signal                          | Measurement                          |
| ------------------------------- | ------------------------------------ |
| Low friction scores             | Average < 2                          |
| High completion rate            | > 90% of tasks reach Done            |
| Minimal blocked time            | < 10% of session time                |
| Decreasing repeat errors        | Same pattern not triggered > 2x/week |
| Increasing autonomous decisions | Fewer escalations per task           |
| Documentation self-sufficiency  | < 1 clarification question per task  |

### Signals That Workflow Has Problems

| Signal               | Measurement                     | Likely Cause                       |
| -------------------- | ------------------------------- | ---------------------------------- |
| High friction scores | Average > 3                     | Missing docs, bad tools            |
| Frequent blocks      | > 20% of tasks blocked          | Dependency on human, unclear scope |
| Pattern explosion    | > 5 new patterns/week           | Systemic issue, not edge cases     |
| Repeat errors        | Same error > 3x despite pattern | Pattern not discoverable           |
| Agent confusion      | Multiple mode switches per task | Unclear process boundaries         |
| Long task times      | > 2x expected duration          | Scope creep, missing context       |

### Tracking Over Time

**Store metrics in a simple file:**

```jsonl
{"date":"2026-01-24","tasks":5,"avgFriction":1.8,"completionRate":1.0,"blockedPct":0.05,"healthScore":87}
{"date":"2026-01-25","tasks":3,"avgFriction":2.3,"completionRate":0.67,"blockedPct":0.15,"healthScore":71}
```

**Location:** `.agent-memory/workflow-metrics.jsonl`

**Review:** Plot weekly to see trends.

---

## Part 5: Proposed Additions to Agent Workflow

### 1. Add "META" Mode for Workflow Improvement

**Triggered by:**

- Friction score ≥ 4 on a task
- Weekly audit schedule
- Explicit "audit workflow" command

**META mode behavior:**

```
META MODE
├── Pause current work (if any)
├── Run workflow audit checklist
├── Calculate health score
├── Identify top 3 friction sources
├── Create workflow-improvement Issues
├── Update docs/patterns as needed
└── Return to normal work
```

**Add to mode taxonomy in SWE agent:**

```markdown
### META mode

When: Workflow itself needs improvement.

- Run weekly audit checklist
- Calculate and record health score
- Identify and fix top friction sources
- Output: Workflow improvements + updated health metrics
```

### 2. Workflow Audit Frequency

| Trigger                     | Audit Type       | Scope                    |
| --------------------------- | ---------------- | ------------------------ |
| End of every task           | Micro-reflection | Friction score only      |
| Start of each session       | Session review   | Check for stale patterns |
| Weekly (Monday AM)          | Full audit       | Complete checklist       |
| After 3+ friction ≥ 4 tasks | Emergency audit  | Root cause analysis      |

### 3. Where to Capture Findings

| Finding Type         | Location                               |
| -------------------- | -------------------------------------- |
| Immediate fix        | PR that includes the fix               |
| Future fix           | Issue tagged `workflow-improvement`    |
| Reusable pattern     | CMC_GO_PATTERNS.md                     |
| Metric data          | `.agent-memory/workflow-metrics.jsonl` |
| Weekly audit results | Issue tagged `workflow-audit`          |

### 4. New Issue Label: `workflow-improvement`

Create label for workflow improvement tasks:

- **Name:** `workflow-improvement`
- **Color:** `#8B5CF6` (purple)
- **Description:** Improvements to agent workflow, docs, or tooling

### 5. Recurring Workflow Improvement Task

**Create a recurring Issue template:**

```markdown
---
name: Weekly Workflow Audit
about: Regular workflow health check
title: "Weekly Workflow Audit — [DATE]"
labels: workflow-improvement, recurring
---

## Audit Checklist

- [ ] Review friction scores from past week
- [ ] Calculate health score
- [ ] Identify top 3 friction sources
- [ ] Check for stale patterns
- [ ] Review blocked time causes
- [ ] Propose improvements
- [ ] Update metrics file

## Findings

<!-- TL fills this in -->

## Health Score

<!-- Calculate and record -->

## Action Items

<!-- List improvements to make -->
```

---

## Part 6: Implementation Recommendations

### Immediate Actions (This Session)

1. ✅ Create this document (WORKFLOW_HEALTH.md)
2. Add friction score to End-of-Task Reflection template in AGENTS.md
3. Create `.agent-memory/workflow-metrics.jsonl` file structure
4. Add META mode to software-engineer.agent.md

### Short-term (This Week)

1. Create `workflow-improvement` label in GitHub
2. Create first Weekly Audit Issue
3. Run baseline audit to establish initial health score
4. Document initial metrics

### Long-term (Ongoing)

1. Track weekly health scores
2. Review and prune CMC_GO_PATTERNS.md monthly
3. Adjust autonomy level based on metrics
4. Graduate to L3 autonomy when health score consistently > 85

---

## Summary

| Question                           | Answer                                         |
| ---------------------------------- | ---------------------------------------------- |
| What does "fully autonomous" mean? | L3: Routine tasks without human, defined gates |
| What are the blockers?             | Secrets, prod deploy, architectural decisions  |
| How do agents test their workflow? | Friction scores + weekly audits                |
| How do they identify friction?     | Score each task 0-5, track patterns            |
| How do they improve?               | Immediate edits, Issues, patterns              |
| How do they measure success?       | Health score (0-100), tracked over time        |
| Should there be a META mode?       | Yes — for audits and workflow improvement      |
| How often should audits run?       | Micro (per task), weekly (full)                |
| Where are findings captured?       | PRs, Issues, patterns file, metrics file       |
| Should this be recurring?          | Yes — weekly audit Issue                       |
