# CMC Go — Build Map

**Owner:** Coordinator  
**Last verified:** Jan 19, 2026 · 2:50 AM CT

This document governs **build progression and verification** for CMC Go. It is the **single source of truth** for determining the system’s current build position and when advancement is allowed.

Maintenance rule: the **Coordinator** updates this file whenever a PR meaningfully changes build position, scope, or verification status.

---

## Latest Work Update

**Current Position:** Phase 1.2 — Cross-View Consistency & Reliability

Latest work has been focused on validating cross-view state behavior, with particular attention on map ↔ panel synchronization and follow-up view consistency. Progress has been steady but non-trivial: most core logic is in place, however verification is ongoing to ensure no edge-case desyncs remain.

Recent friction has come from environment and deployment issues (Sentry env vars and lockfile mismatches), which temporarily slowed verification but did not change scope. No fundamental blockers are present; remaining work is primarily careful validation rather than new implementation.

Recent coordination/doc stabilization work landed in `staging`:
- Merge of `agent/docs/agent-playbook-nav` into `staging` (commit `3469e19`)
- Fix GitHub Issue discovery link quoting for `role:coordinator` label (commit `5a1c844`)

---

## v1.0 — Core Build

### Phase 1: Core System Integrity

**Objective:** Ensure the system is correct, stable, and observable before any UX polish, access control, or optimization.

---

### Data Model & Schema

- 🟢 **Schema finalized and aligned** — Completed  
- 🟢 **ENUM discipline enforced** — Completed  
- 🟢 **Seed data normalized and stable** — Completed  

---

### Core Flows

- 🟢 **District list renders correctly** — Completed  
- 🟢 **Campus list renders correctly** — Completed  
- 🟢 **People list renders correctly** — Completed  
- 🟢 **Person detail view renders correctly** — Completed  
- 🟢 **Edits persist to database and rehydrate on refresh** — Completed  
- 🟢 **Notes flow functional** — Completed  
- 🟢 **Needs flow functional** — Completed  

---

### State Management

- 🟢 **URL filter state persistence** — Completed  
  - PR #36  
  - Commit: `1089909`

- 🟢 **Lazy initialization for URL filter params** — Completed  
  - PR #39  
  - Commit: `d600c31`

- 🟢 **Optimized URL parsing** — Completed  
  - Commit: `7342ada`

---

### Follow-Up & Visibility

- 🟢 **Active needs surfaced in Follow-Up view** — Completed  
  - PR #21  
  - Commit: `b3ecdc6`

- ⚪ **Needs filter in People view** — Backlog  
  - PR #31

- ⚪ **Explicit “Active Need” definition** — Backlog  
  - PR #30

- ⚪ **Districts grouped by region in People filters** — Backlog  
  - PR #33

---

### Observability

- 🟢 **Sentry initialized in client entrypoint** — Completed  
  - PR #40  
  - Commit: `a013d26`

- 🟢 **Sentry test trigger wired in People view** — Completed  
  - PR #42  
  - Commit: `50f9616`

- ⚪ **Promote Sentry test trigger to staging** — Backlog  
  - PR #43

- ⚪ **Upgrade to @sentry/react v8.0.0** — Backlog  
  - PR #45

- 🟢 **Code Coverage with Codecov configured** — Completed  
  - GitHub Actions workflow: `.github/workflows/test-and-coverage.yml`  
  - Commit: `12ca7b1`

- 🟢 **AI Code Review (Beta) enabled in Sentry** — Completed  
  - Automated AI review of pull requests  
  - Documentation: `docs/runbook/CODE_COVERAGE_AND_AI_CODE_REVIEW.md`

---

### Cross-View State

- 🔵 **Map ↔ Panel state synchronization** — In Progress  
- 🟡 **Status updates propagate across all views** — Verification Needed  
- 🟡 **Follow-Up view state consistency** — Verification Needed  

---

## Phase 2: Desktop UX & Navigation

**Objective:** Make the system efficient and intuitive in its primary desktop environment.

### Default Scope & View Modes

- ⚪ **Default regional scope (TEXICO)** — Backlog  
- ⚪ **Default district panel (South Texas)** — Backlog  
- ⚪ **View mode selector** — Backlog  
  - National  
  - Regional  
  - District  

### Panel Behavior

- 🟡 **Stable panel open/close behavior** — Verification Needed  
- ⚪ **Smooth panel transitions** — Backlog  
- ⚪ **Panel state persistence** — Backlog  

### Filters & Sorting

- 🔵 **District-level needs visibility** — In Progress  
- 🔵 **Filter logic clarity and predictability** — In Progress  
- ⚪ **Status-based visibility rules** — Backlog  

### Navigation & Usability

- 🟡 **Clear navigation patterns** — Verification Needed  
- 🟡 **No blocking UX friction** — Verification Needed  
- 🟡 **Leader-friendly primary flows** — Verification Needed  

---

## Phase 3: Authentication & Authorization (Late v1)

**Objective:** Lock down access only after behavior and UX are stable.

**Note:** Authentication is intentionally deferred to avoid compounding debugging complexity.

### Authentication

- ⚪ **Login flow** — Backlog  
- ⚪ **Session management** — Backlog  
- ⚪ **Logout flow** — Backlog  

### Role-Based Access

- ⚪ **Role definitions** — Backlog  
  - Campus Director  
  - District Director  
  - Region Director  
  - Admin / National  

- ⚪ **Role-based view gating** — Backlog  
- ⚪ **Permission enforcement** — Backlog  

### Authorized Views

- ⚪ **View access control** — Backlog  
- ⚪ **Data visibility scoped by role** — Backlog  
- ⚪ **Authorization enforcement consistency** — Backlog  

---

## Phase 4: Mobile Optimization (Final v1 Phase)

**Objective:** Adapt a completed and stable system to mobile constraints.

### Mobile Layout

- ⚪ **Responsive layout** — Backlog  
- ⚪ **Mobile-specific panel behavior** — Backlog  
- ⚪ **Touch-friendly spacing** — Backlog  

### Touch Interactions

- ⚪ **Minimum touch targets (44×44px)** — Backlog  
- ⚪ **Swipe gestures** — Backlog  
- ⚪ **Mobile-optimized controls** — Backlog  

### Core Mobile Flows

- ⚪ **Status updates** — Backlog  
- ⚪ **Notes entry** — Backlog  
- ⚪ **Needs tracking** — Backlog  
- ⚪ **Follow-Up view usability** — Backlog  

---

## v1.0 Definition of Completion

v1.0 is considered **build-complete** when:

- All Phase 1–4 items are **Completed**
- Staging behavior matches expected functionality
- Observability is verified and operational
- Lead Developer explicitly signs off for production readiness

---

## Progression Model

⚪ → 🔵 → 🟡 → 🟢
        ↘
         🔴

## Status Legend
- ⚪ **Backlog** — Approved scope, not started
- 🔵 **In Progress** — Actively being worked
- 🔴 **Blocked** — Waiting on dependency or decision
- 🟡 **Verification Needed** — Implemented, pending confirmation
- 🟢 **Completed** — Implemented and verified
