# CMC Go — Project Tracker

**Reflects verified state as of Jan 4, 2026**  
**Owned and maintained by Lead Developer**

This document shows the full journey of CMC Go from first commit to production, organized by versions and verified milestones.

---

## V1 — Core Production Release

### Phase 1: Core System Integrity

**Goal**: Make the app correct before making it nice.

#### Data Model & Schema
- ✅ **Schema finalized and aligned** — Verified
- ✅ **ENUM discipline enforced** — Verified  
- ✅ **Seed normalized and stable** — Verified

#### Core Workflows
- ✅ **District list functional** — Verified
- ✅ **Campus list functional** — Verified
- ✅ **People list functional** — Verified
- ✅ **Person detail view** — Verified
- ✅ **Edit & persistence working** — Verified
- ✅ **Notes system functional** — Verified
- ✅ **Needs system functional** — Verified

#### Status & State Management  
- ✅ **URL filter state persistence** — Verified ([#36](https://github.com/sirjamesoffordii/CMC-Go/pull/36), commit 1089909)
- ✅ **Lazy initialization for URL filter params** — Verified ([#39](https://github.com/sirjamesoffordii/CMC-Go/pull/39), commit d600c31)
- ✅ **URL parsing optimization** — Verified (commit 7342ada)

#### Follow-Up & Visibility
- ✅ **Show people with active needs in follow-up view** — Verified ([#21](https://github.com/sirjamesoffordii/CMC-Go/pull/21) merged, commit b3ecd c6)
- ⏳ **Add 'Needs' filter to People tab** — Planned ([#31](https://github.com/sirjamesoffordii/CMC-Go/pull/31))
- ⏳ **Add explicit Active Need definition** — Planned ([#30](https://github.com/sirjamesoffordii/CMC-Go/pull/30))
- ⏳ **Group districts by region in People tab filter** — Planned ([#33](https://github.com/sirjamesoffordii/CMC-Go/pull/33))

#### Infrastructure & Observability
- ✅ **Sentry initialization in main.tsx** — Verified ([#40](https://github.com/sirjamesoffordii/CMC-Go/pull/40), commit a013d26)
- ✅ **Sentry test trigger in People component** — Verified ([#42](https://github.com/sirjamesoffordii/CMC-Go/pull/42), commit 50f9616)
- ⏳ **Promote Sentry test trigger to staging** — Planned ([#43](https://github.com/sirjamesoffordii/CMC-Go/pull/43))
- ⏳ **Add @sentry/react dependency v8.0.0** — Planned ([#45](https://github.com/sirjamesoffordii/CMC-Go/pull/45))

#### Cross-View Consistency
- ⏳ **Map ↔ Panel synchronization** — In Progress
- ⏳ **Status changes reflected everywhere** — Needs Verification
- ⏳ **Follow-up view consistency** — Needs Verification

---

### Phase 2: Desktop UX & Flow

**Goal**: Make the app usable in its primary environment (desktop/laptop).

#### Default Startup & View Modes
- ⏳ **Regional view (TEXICO) as default** — Planned  
- ⏳ **District panel open to South Texas by default** — Planned
- ⏳ **View selector control** — Planned  
  - National view (all regions)
  - Regional view (single region)  
  - District view (single district)

#### Panel Behavior
- ⏳ **Stable panel open/close** — Needs Verification
- ⏳ **Smooth transitions** — Planned
- ⏳ **Panel state persistence** — Planned

#### Filters & Sorting
- ⏳ **District-level needs visibility** — In Progress
- ⏳ **Filtering logic clarity** — In Progress  
- ⏳ **Status-based visibility rules** — Planned

#### Navigation & Usability
- ⏳ **Clear navigation patterns** — Needs Verification
- ⏳ **No blocking UX friction** — Needs Verification
- ⏳ **Leader-friendly flows** — Needs Verification

---

### Phase 3: Auth & Authorized Views (Late V1)

**Goal**: Lock things down after behavior is correct.

**Note**: Auth happens late V1 to avoid debugging complexity during core development.

#### Authentication
- ⏳ **Login flow** — Planned
- ⏳ **Session management** — Planned
- ⏳ **Logout** — Planned

#### Role-Based Access
- ⏳ **Role definitions** — Planned  
  - Campus Director
  - District Director
  - Region Director  
  - Admin/National
- ⏳ **Role-based view gating** — Planned
- ⏳ **Permission enforcement** — Planned

#### Authorized Views
- ⏳ **View access control** — Planned
- ⏳ **Data visibility by role** — Planned
- ⏳ **Enforcement consistency** — Planned

---

### Phase 4: Mobile Optimization (Final V1 Step)

**Goal**: Adapt a finished system to a constrained environment.

**Note**: Mobile is always last in V1 to avoid premature optimization and rework.

#### Mobile Layout
- ⏳ **Responsive layout** — Planned
- ⏳ **Mobile panel behavior** — Planned  
- ⏳ **Touch-friendly spacing** — Planned

#### Touch Interactions
- ⏳ **Touch targets (min 44x44px)** — Planned
- ⏳ **Swipe gestures** — Planned
- ⏳ **Mobile-optimized controls** — Planned

#### Critical Workflows on Mobile
- ⏳ **Status updates** — Planned
- ⏳ **Notes entry** — Planned
- ⏳ **Needs tracking** — Planned
- ⏳ **Follow-up view usability** — Planned

---

## V1 Completion Criteria

V1 is complete when:
- All Phase 1-4 items marked ✅ Verified
- Staging behavior matches expected functionality
- Lead Developer signs off

---

## V2 — Expansion (Future)

**Not active**. Do not begin V2 work until V1 is fully complete and deployed.

### Planned V2 Features
- ⏳ **SVG animations triggered on status change in district slideout panel**  
  - Requires animation R&D
  - Requires asset upload/pipeline  
  - Explicitly out of scope for V1

---

## Status Legend

- ✅ **Verified** — Confirmed in code and/or staging
- 🔄 **In Progress** — Active development
- ⏳ **Planned** — Scoped but not started  
- 🔴 **Blocked** — Cannot proceed (rare)
- 🔍 **Needs Verification** — Implemented but requires staging confirmation
