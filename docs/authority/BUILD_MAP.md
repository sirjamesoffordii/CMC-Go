# CMC Go — Build Map

**Owner:** Autonomous Agent (VS Code)  
**Last verified:** Jan 15, 2026  
**Reference:** See [CMC_GO_BRIEF.md](../../docs/agents/CMC_GO_BRIEF.md#build-direction) for phase definitions

This document tracks **build progression and verification** for CMC Go. It is the **single source of truth** for determining system build position and advancement readiness.

See [Agent Documentation](../../AGENTS.md) and [System Brief](../../docs/agents/CMC_GO_BRIEF.md) for decision heuristics and context.

---

## Build Phase Overview (from CMC_GO_BRIEF.md)

Priority order by phase:
- **Phase A — System Integrity** (Always): Auth correctness, visibility enforcement, schema discipline, stable builds
- **Phase B — Core Workflows**: Map navigation, people list correctness, person detail accuracy, filters reflecting real data
- **Phase C — Operator Experience**: Clear next actions, reduced cognitive load, consistent visuals
- **Phase D — Observability & Safety**: Error visibility, fail-closed behavior, guardrails
- **Phase E — Polish & Performance**: Animations, optimizations

---

## Current Work Position

**Status:** Phase A (System Integrity) — Cross-View Consistency & Reliability

Most core logic is implemented. Current focus: validating cross-view state behavior (map ↔ panel synchronization, follow-up view consistency). Verification ongoing; no fundamental blockers.

---

## Phase A: System Integrity (CURRENT)

Objective: Ensure the system is correct, stable, and observable before any UX polish, access control, or optimization.

### Auth Correctness
- Authorization system enforced server-side
- UI never invents access
- Client-only hiding is a defect
- All role-based queries validated

### Schema Discipline
- 🟢 **Schema finalized and aligned** — Completed
- 🟢 **ENUM discipline enforced** — Completed
- 🟢 **Seed data normalized and stable** — Completed

### Data Integrity
- 🟢 **Edits persist to database and rehydrate on refresh** — Completed
- 🟡 **Cross-view state consistency** — In Progress
- 🟡 **Status updates propagate across all views** — Verification Needed

### Core Flows
- 🟢 **District list renders correctly** — Completed
- 🟢 **Campus list renders correctly** — Completed
- 🟢 **People list renders correctly** — Completed
- 🟢 **Person detail view renders correctly** — Completed
- 🟢 **Notes flow functional** — Completed
- 🟢 **Needs flow functional** — Completed

### Observability
- 🟢 **Sentry initialized in client entrypoint** — Completed
- 🟢 **Sentry test trigger wired in People view** — Completed
- 🟢 **Code Coverage with Codecov configured** — Completed
- 🟢 **AI Code Review (Beta) enabled in Sentry** — Completed

### Stable Builds
- 🟢 **Deterministic dependencies** — Completed
- 🟢 **CI pipeline operational** — Completed
- 🟡 **Build reproducibility verified** — Verification Needed

---

## Phase B: Core Workflows (NEXT)

Objective: Establish map navigation, people list accuracy, person detail correctness, and filters that reflect real data.

### Map Navigation
- ⚪ **Default regional scope (TEXICO)** — Backlog
- ⚪ **Default district panel (South Texas)** — Backlog
- ⚪ **Smooth map interaction and panning** — Backlog

### People List Correctness
- 🟢 **URL filter state persistence** — Completed
- 🟢 **Lazy initialization for URL filter params** — Completed
- 🔵 **Filter logic clarity and predictability** — In Progress
- ⚪ **Needs filter in People view** — Backlog
- ⚪ **Districts grouped by region in People filters** — Backlog

### Person Detail Accuracy
- 🟢 **Person detail view renders correctly** — Completed
- 🟡 **Status updates persist and propagate** — Verification Needed
- 🟡 **Notes and needs display accurately** — Verification Needed

### Follow-Up View
- 🟢 **Active needs surfaced in Follow-Up view** — Completed
- 🟡 **Follow-Up view state consistency** — Verification Needed
- ⚪ **Explicit 'Active Need' definition** — Backlog

---

## Phase C: Operator Experience (FUTURE)

Objective: Make the system efficient and intuitive for regional/district leaders.

### Navigation Clarity
- ⚪ **Clear next actions from each view** — Backlog
- ⚪ **Intuitive view mode selector** — Backlog
- ⚪ **Consistent visual language across views** — Backlog

### Panel Behavior
- 🟡 **Stable panel open/close behavior** — Verification Needed
- ⚪ **Smooth panel transitions** — Backlog
- ⚪ **Panel state persistence** — Backlog

### Workflow Efficiency
- ⚪ **Leader-friendly primary flows** — Backlog
- ⚪ **Quick status updates** — Backlog
- ⚪ **Notes and needs entry streamlined** — Backlog

---

## Phase D: Observability & Safety (FUTURE)

Objective: Detect errors early, fail safely, and maintain guardrails.

### Error Visibility
- ⚪ **User-friendly error messages** — Backlog
- ⚪ **Error details logged to Sentry** — Backlog
- ⚪ **Performance monitoring active** — Backlog

### Fail-Closed Behavior
- ⚪ **Unauthorized requests rejected cleanly** — Backlog
- ⚪ **Invalid state detected and prevented** — Backlog
- ⚪ **Graceful degradation on service issues** — Backlog

### Guardrails
- ⚪ **Data validation on all inputs** — Backlog
- ⚪ **Rate limiting on mutations** — Backlog
- ⚪ **Audit logging for sensitive operations** — Backlog

---

## Phase E: Polish & Performance (FINAL)

Objective: Optimize animations, performance, and visual refinement.

### Animations
- ⚪ **Page transitions smooth** — Backlog
- ⚪ **List updates animated** — Backlog
- ⚪ **Modal and panel animations** — Backlog

### Performance
- ⚪ **Query optimization** — Backlog
- ⚪ **Frontend bundle size reduction** — Backlog
- ⚪ **Lazy loading of large lists** — Backlog

### Visual Polish
- ⚪ **Consistent spacing and typography** — Backlog
- ⚪ **Dark mode support** — Backlog
- ⚪ **Mobile responsiveness** — Backlog

---

## Status Legend

- ⚪ **Backlog** — Approved scope, not started
- 🔵 **In Progress** — Actively being worked
- 🔴 **Blocked** — Waiting on dependency or decision
- 🟡 **Verification Needed** — Implemented, pending confirmation
- 🟢 **Completed** — Implemented and verified

---

## Progression Model

⚪ → 🔵 → 🟡 → 🟢

Blocked: 🔴

---

## Decision Principles

From [CMC_GO_BRIEF.md](../../docs/agents/CMC_GO_BRIEF.md):
- Coherence beats speed long-term
- The system must always tell the truth
- Auth is structural, not a feature
- State must be explicit and traceable
- Belief without evidence is debt
- Prefer small diffs, backend truth, and fixes over features

