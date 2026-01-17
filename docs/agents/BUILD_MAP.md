# CMC Go — Build Map

**Owner:** Autonomous Agent (VS Code)  
**Last verified:** Jan 15, 2026  
**Status:** Phase A (System Integrity) — Cross-View Consistency & Reliability

This document synthesizes **system phases, development heuristics, and task tracking** for CMC Go. It is the **single source of truth** for understanding what phase we're in, what matters at each phase, and what's done vs. next.

See [CMC_GO_COORDINATOR.md](../authority/CMC_GO_COORDINATOR.md) for coordination + truth enforcement and [CMC_GO_BRIEF.md](CMC_GO_BRIEF.md) for the system mental model.

---

## Build Philosophy

**From CMC_GO_BRIEF.md — Learned Truths:**
- Coherence beats speed long-term
- The system must always tell the truth
- Auth is structural, not a feature
- State must be explicit and traceable

**Priority order:**
1. Correctness
2. Visibility & auth integrity
3. Data consistency
4. Workflow clarity
5. Operator confidence
6. UI polish
7. Performance

**Prefer:** Small diffs, backend truth, fixes over features  
**Avoid:** Broad refactors, UI masking backend issues, premature abstractions

---

## Phase Structure

CMC Go follows a disciplined build progression. Each phase has a clear objective and acceptance criteria. We do not advance until the current phase is stable.

---

## Phase A: System Integrity (CURRENT)

**Objective:** Ensure the system is correct, stable, and observable before any UX polish, access control, or optimization.

**Completion criteria:** All core flows work, state is consistent across views, errors are observable, builds are deterministic.

### Auth Correctness
- Authorization system enforced server-side
- UI never invents access
- Client-only hiding is a defect
- All role-based queries validated

**Tasks:**
- 🟢 Authorization system in place and tested
- 🟢 Server-side permission checks on all mutations
- 🟡 Cross-view auth consistency verification needed

### Schema Discipline
- 🟢 **Schema finalized and aligned** — Completed
- 🟢 **ENUM discipline enforced** — Completed
- 🟢 **Seed data normalized and stable** — Completed

### Data Integrity & Consistency
- 🟢 **Edits persist to database and rehydrate on refresh** — Completed
- 🔵 **Cross-view state consistency** — In Progress
- 🟡 **Status updates propagate across all views** — Verification Needed
- 🟢 **Notes flow functional** — Completed
- 🟢 **Needs flow functional** — Completed

### Core Flows (List & Detail)
- 🟢 **District list renders correctly** — Completed
- 🟢 **Campus list renders correctly** — Completed
- 🟢 **People list renders correctly** — Completed
- 🟢 **Person detail view renders correctly** — Completed
- 🟢 **URL filter state persistence** — Completed
- 🟢 **Lazy initialization for URL filter params** — Completed

### Observability
- 🟢 **Sentry initialized in client entrypoint** — Completed
- 🟢 **Sentry test trigger wired in People view** — Completed
- 🟢 **Code Coverage with Codecov configured** — Completed
- 🟢 **AI Code Review (Beta) enabled in Sentry** — Completed
- 🟡 **Error logging complete and tested** — Verification Needed

### Stable Builds
- 🟢 **Deterministic dependencies** — Completed
- 🟢 **CI pipeline operational** — Completed
- 🟡 **Build reproducibility verified** — Verification Needed
- 🟢 **Seed data stable and idempotent** — Completed

---

## Phase B: Core Workflows (NEXT)

**Objective:** Establish map navigation, people list accuracy, person detail correctness, and filters that reflect real data.

**Completion criteria:** Users can navigate by district, see correct people at each scope, update records, and view follow-ups without confusion.

### Map Navigation & Scope
- ⚪ **Default regional scope (TEXICO)** — Backlog
- ⚪ **Default district panel (South Texas)** — Backlog
- ⚪ **Smooth map interaction and panning** — Backlog
- ⚪ **Map selection correctly constrains data queries** — Backlog

### People List Correctness
- 🟢 **URL filter state persistence** — Completed
- 🟢 **Lazy initialization for URL filter params** — Completed
- 🔵 **Filter logic clarity and predictability** — In Progress
- ⚪ **Needs filter in People view** — Backlog
- ⚪ **Districts grouped by region in People filters** — Backlog
- ⚪ **Filter state reflects selected map scope** — Backlog

### Person Detail Accuracy
- 🟢 **Person detail view renders correctly** — Completed
- 🟡 **Status updates persist and propagate** — Verification Needed
- 🟡 **Notes and needs display accurately** — Verification Needed
- ⚪ **Person detail reflects current map scope** — Backlog

### Follow-Up View & Visibility
- 🟢 **Active needs surfaced in Follow-Up view** — Completed
- 🟡 **Follow-Up view state consistency** — Verification Needed
- ⚪ **Explicit 'Active Need' definition** — Backlog
- ⚪ **Follow-Up respects user's scope (district or region)** — Backlog

---

## Phase C: Operator Experience (FUTURE)

**Objective:** Make the system efficient and intuitive for regional/district leaders.

**Completion criteria:** Leaders know what action to take next, navigation is obvious, workflows complete in 1-2 interactions.

### Navigation Clarity
- ⚪ **Clear next actions from each view** — Backlog
- ⚪ **Intuitive view mode selector** — Backlog
- ⚪ **Consistent visual language across views** — Backlog
- ⚪ **Breadcrumb or scope indicator visible everywhere** — Backlog

### Panel Behavior
- 🟡 **Stable panel open/close behavior** — Verification Needed
- ⚪ **Smooth panel transitions** — Backlog
- ⚪ **Panel state persistence across navigation** — Backlog
- ⚪ **Click-outside closes panel smoothly** — Backlog

### Workflow Efficiency
- ⚪ **Leader-friendly primary flows** — Backlog
- ⚪ **Quick status updates (1 click)** — Backlog
- ⚪ **Notes and needs entry streamlined** — Backlog
- ⚪ **Bulk actions where applicable** — Backlog

---

## Phase D: Observability & Safety (FUTURE)

**Objective:** Detect errors early, fail safely, and maintain guardrails.

**Completion criteria:** All failures are visible, no silent data errors, system recovers gracefully from network/service failures.

### Error Visibility
- ⚪ **User-friendly error messages** — Backlog
- ⚪ **Error details logged to Sentry with context** — Backlog
- ⚪ **Performance monitoring and alerting active** — Backlog
- ⚪ **Slow queries detected and logged** — Backlog

### Fail-Closed Behavior
- ⚪ **Unauthorized requests rejected cleanly** — Backlog
- ⚪ **Invalid state detected and prevented** — Backlog
- ⚪ **Graceful degradation on service issues** — Backlog
- ⚪ **Stale data detection and refresh** — Backlog

### Guardrails
- ⚪ **Data validation on all inputs** — Backlog
- ⚪ **Rate limiting on mutations** — Backlog
- ⚪ **Audit logging for sensitive operations** — Backlog
- ⚪ **Duplicate request protection** — Backlog

---

## Phase E: Polish & Performance (FINAL)

**Objective:** Optimize animations, performance, and visual refinement.

**Completion criteria:** System feels responsive, smooth, and polished. Load times <1s, animations are subtle and intentional.

### Animations
- ⚪ **Page transitions smooth and purposeful** — Backlog
- ⚪ **List updates animated** — Backlog
- ⚪ **Modal and panel animations** — Backlog
- ⚪ **Loading states with spinners/skeletons** — Backlog

### Performance
- ⚪ **Query optimization (N+1 elimination)** — Backlog
- ⚪ **Frontend bundle size reduction** — Backlog
- ⚪ **Lazy loading of large lists** — Backlog
- ⚪ **Database index validation** — Backlog

### Visual Polish
- ⚪ **Consistent spacing and typography** — Backlog
- ⚪ **Dark mode support** — Backlog
- ⚪ **Mobile responsiveness** — Backlog
- ⚪ **Accessibility audit (WCAG AA)** — Backlog

---

## Status Legend

| Status | Meaning |
|--------|---------|
| ⚪ | Backlog — Approved scope, not started |
| 🔵 | In Progress — Actively being worked |
| 🔴 | Blocked — Waiting on dependency or decision |
| 🟡 | Verification Needed — Implemented, pending confirmation |
| 🟢 | Completed — Implemented and verified |

---

## Progression Model

```
⚪ → 🔵 → 🟡 → 🟢
         ↘
          🔴 (blocked)
```

A task moves forward only when all acceptance criteria are met. No shortcuts, no "mostly done."

---

## Decision Gates

Before advancing to the next phase:
1. All current phase tasks are 🟢
2. No 🔴 (blocked) tasks remain
3. No 🟡 (verification needed) tasks remain
4. System behavior matches specification
5. Staging is stable and passes CI/CD
6. Observability confirms correctness

---

## Agent Success in Each Phase

**Phase A (current):** State is truthful. No sync errors. Builds reproduce.  
**Phase B:** Users can navigate without confusion. Data appears where expected.  
**Phase C:** Users know what to do next. Workflows are obvious.  
**Phase D:** Errors are visible. System fails safely.  
**Phase E:** System feels fast and responsive.

---

## Navigation

- **System Mental Model:** [CMC_GO_BRIEF.md](CMC_GO_BRIEF.md)
- **Coordinator Role:** [CMC_GO_COORDINATOR.md](../authority/CMC_GO_COORDINATOR.md)
- **Human Authority (Sir James):** [USER_SIR_JAMES.md](../authority/USER_SIR_JAMES.md)
- **Technical Productivity:** [.github/copilot-instructions.md](../../.github/copilot-instructions.md)
