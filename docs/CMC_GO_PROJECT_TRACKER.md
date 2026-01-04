# CMC Go — Delivery Tracker (v1)

**Status:** Active  
**Last verified:** Jan 4, 2026  
**Owner:** Lead Developer

This document is the single source of truth for delivery status and release readiness for CMC Go. It tracks versioned scope, milestones, and verification state from initial development through production.

---

## v1.0 — Core Release

### Phase 1: Core System Integrity

**Objective:** Prioritize correctness and system integrity before UX polish.

#### Data Model & Schema

- ✅ **Schema finalized and aligned** — Done
- ✅ **ENUM discipline enforced** — Done
- ✅ **Seed data normalized and stable** — Done

#### Core Flows

- ✅ **District list renders correctly** — Done
- ✅ **Campus list renders correctly** — Done
- ✅ **People list renders correctly** — Done
- ✅ **Person detail view renders correctly** — Done
- ✅ **Edits persist to database and rehydrate on refresh** — Done
- ✅ **Notes flow functional** — Done
- ✅ **Needs flow functional** — Done

#### State Management

- ✅ **URL filter state persistence** — Done ([#36](https://github.com/sirjamesoffordii/CMC-Go/pull/36), commit 1089909)
- ✅ **Lazy initialization for URL filter params** — Done ([#39](https://github.com/sirjamesoffordii/CMC-Go/pull/39), commit d600c31)
- ✅ **Optimized URL parsing** — Done (commit 7342ada)

#### Follow-Up & Visibility

- ✅ **Active needs surfaced in Follow-Up view** — Done ([#21](https://github.com/sirjamesoffordii/CMC-Go/pull/21), commit b3ecdc6)
- 🗒️ **Needs filter in People view** — Backlog ([#31](https://github.com/sirjamesoffordii/CMC-Go/pull/31))
- 🗒️ **Explicit "Active Need" definition** — Backlog ([#30](https://github.com/sirjamesoffordii/CMC-Go/pull/30))
- 🗒️ **Districts grouped by region in People filters** — Backlog ([#33](https://github.com/sirjamesoffordii/CMC-Go/pull/33))

#### Observability

- ✅ **Sentry initialized in main.tsx** — Done ([#40](https://github.com/sirjamesoffordii/CMC-Go/pull/40), commit a013d26)
- ✅ **Sentry test trigger wired in People view** — Done ([#42](https://github.com/sirjamesoffordii/CMC-Go/pull/42), commit 50f9616)
- 🗒️ **Promote Sentry test trigger to staging** — Backlog ([#43](https://github.com/sirjamesoffordii/CMC-Go/pull/43))
- 🗒️ **Add @sentry/react v8.0.0 dependency** — Backlog ([#45](https://github.com/sirjamesoffordii/CMC-Go/pull/45))

#### Cross-View State

- 🔄 **Map ↔ Panel state synchronization** — In Progress
- 🧪 **Status updates propagate across all views** — QA Needed
- 🧪 **Follow-Up view state consistency** — QA Needed

---

### Phase 2: Desktop UX & Navigation

**Objective:** Ensure the app is efficient and intuitive in its primary desktop environment.

#### Default Scope & View Modes

- 🗒️ **Default regional scope (TEXICO)** — Backlog
- 🗒️ **Default district panel (South Texas)** — Backlog
- 🗒️ **View mode selector** — Backlog
  - National
  - Regional
  - District

#### Panel Behavior

- 🧪 **Stable panel open/close behavior** — QA Needed
- 🗒️ **Smooth panel transitions** — Backlog
- 🗒️ **Panel state persistence** — Backlog

#### Filters & Sorting

- 🔄 **District-level needs visibility** — In Progress
- 🔄 **Filter logic clarity and predictability** — In Progress
- 🗒️ **Status-based visibility rules** — Backlog

#### Navigation & Usability

- 🧪 **Clear navigation patterns** — QA Needed
- 🧪 **No blocking UX friction** — QA Needed
- 🧪 **Leader-friendly primary flows** — QA Needed

---

### Phase 3: Authentication & Authorization (Late v1)

**Objective:** Lock down access once behavior and UX are stable.

**Note:** Authentication is intentionally deferred to avoid compounding debugging complexity during core development.

#### Authentication

- 🗒️ **Login flow** — Backlog
- 🗒️ **Session management** — Backlog
- 🗒️ **Logout flow** — Backlog

#### Role-Based Access

- 🗒️ **Role definitions** — Backlog
  - Campus Director
  - District Director
  - Region Director
  - Admin / National
- 🗒️ **Role-based view gating** — Backlog
- 🗒️ **Permission enforcement** — Backlog

#### Authorized Views

- 🗒️ **View access control** — Backlog
- 🗒️ **Data visibility scoped by role** — Backlog
- 🗒️ **Authorization enforcement consistency** — Backlog

---

### Phase 4: Mobile Optimization (Final v1 Phase)

**Objective:** Adapt a completed system to mobile constraints.

**Note:** Mobile optimization occurs last to avoid premature optimization and rework.

#### Mobile Layout

- 🗒️ **Responsive layout** — Backlog
- 🗒️ **Mobile-specific panel behavior** — Backlog
- 🗒️ **Touch-friendly spacing** — Backlog

#### Touch Interactions

- 🗒️ **Minimum touch targets (44×44px)** — Backlog
- 🗒️ **Swipe gestures** — Backlog
- 🗒️ **Mobile-optimized controls** — Backlog

#### Core Mobile Flows

- 🗒️ **Status updates** — Backlog
- 🗒️ **Notes entry** — Backlog
- 🗒️ **Needs tracking** — Backlog
- 🗒️ **Follow-Up view usability** — Backlog

---

## v1.0 Definition of Done

v1.0 is complete when:

- All Phase 1–4 items are marked **Done**
- Staging behavior matches expected functionality
- Lead Developer signs off for production release

---

## v2.0 — Enhancements (Backlog)

Not active. Do not begin v2.0 work until v1.0 is fully complete and deployed.

### Planned Enhancements

- 🗒️ **SVG animations on status change in district slide-out panel**
  - Requires animation R&D
  - Requires asset pipeline
  - Explicitly out of scope for v1.0

---

## Status Legend

- ✅ **Done** — Merged and verified in staging
- 🔄 **In Progress** — Active development
- 🧪 **QA Needed** — Implemented, pending verification
- 🗒️ **Backlog** — Approved scope, not started
- 🔴 **Blocked** — Waiting on dependency
