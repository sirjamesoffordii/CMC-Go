# CMC Go — Project Overview

> **Last Updated:** January 23, 2026
> **Project Board:** https://github.com/users/sirjamesoffordii/projects/2

This document provides a complete map of the CMC Go project — what it is, how it works, and what's left to build.

---

## What is CMC Go?

CMC Go is a **map-first coordination app** for managing CMC (Chi Alpha Campus Ministries) conference attendance. It helps regional and district leaders track people, campuses, and follow-up needs across Texas.

### Core Concept

- **Map View** — Interactive SVG map of Texas districts; click a district to see details
- **Panel View** — Side panel shows people, campuses, and needs for selected district
- **Follow-Up View** — Aggregated view of people with active needs requiring attention
- **Role-Based Access** — Users see data scoped to their role (Campus → District → Region → National)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                        │
│  client/src/                                                 │
│  ├── App.tsx              — Main app + routing               │
│  ├── components/          — UI components (map, panel, etc.) │
│  └── _core/               — Hooks, context, utilities        │
├─────────────────────────────────────────────────────────────┤
│                        Server (tRPC + Express)               │
│  server/                                                     │
│  ├── routers.ts           — All tRPC procedures              │
│  ├── _core/index.ts       — Server entry point               │
│  └── _core/authorization.ts — Scope enforcement              │
├─────────────────────────────────────────────────────────────┤
│                        Database (MySQL via Drizzle)          │
│  drizzle/                                                    │
│  ├── schema.ts            — Authoritative schema             │
│  └── migrations/          — SQL migration files              │
└─────────────────────────────────────────────────────────────┘
```

### Key Invariants (Don't Break These)

| Invariant         | Description                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| `districts.id`    | Must match `client/public/map.svg` `<path id="...">` values (case-sensitive) |
| `people.personId` | varchar — cross-table/import key; preserve semantics                         |
| Status enums      | Fixed strings: `Yes`, `Maybe`, `No`, `Not Invited`                           |

---

## Data Model (Simplified)

```
Regions
  └── Districts (map to SVG paths)
        └── Campuses
              └── People
                    ├── Notes (typed: general, follow-up, etc.)
                    └── Needs (active/resolved)
```

### Key Tables

- **regions** — TEXICO, etc.
- **districts** — South Texas, West Texas, etc. (ID = SVG path ID)
- **campuses** — Universities within districts
- **people** — Conference attendees/contacts
- **notes** — Free-form notes on people
- **needs** — Trackable follow-up items (active/resolved)
- **users** — App users (for auth, coming in Phase 3)

---

## Build Phases

### ✅ Phase 1: Core System Integrity (DONE)

**Goal:** System is correct, stable, and observable.

| Area                            | Status  |
| ------------------------------- | ------- |
| Schema finalized                | ✅ Done |
| Core flows (list/detail/edit)   | ✅ Done |
| State management (URL params)   | ✅ Done |
| Follow-up view                  | ✅ Done |
| Observability (Sentry, Codecov) | ✅ Done |

---

### ✅ Phase 1.2: Cross-View Consistency (DONE)

**Goal:** All views stay in sync; no desync edge cases.

| Item                        | Issue | Status  |
| --------------------------- | ----- | ------- |
| Map ↔ Panel state sync     | #102  | ✅ Done |
| Status propagation tests    | #81   | ✅ Done |
| Follow-Up consistency tests | #87   | ✅ Done |

**Epic:** #136 (Closed)

---

### ✅ Phase 2: Desktop UX & Navigation (DONE)

**Goal:** Efficient, intuitive desktop experience.

| Item                                     | Issue | Status    | Notes                                  |
| ---------------------------------------- | ----- | --------- | -------------------------------------- |
| ~~Default district panel (South Texas)~~ | #104  | ❌ Closed | Design changed: default = whole map    |
| ~~View mode selector~~                   | #105  | ❌ Closed | Design changed: automatic by user role |
| Stable panel open/close                  | #106  | ✅ Done   | PR #163                                |
| Smooth panel transitions                 | #107  | ✅ Done   | Already implemented                    |
| Panel state persistence                  | #108  | ✅ Done   |                                        |
| District-level needs                     | #109  | ✅ Done   | PR #166                                |
| Filter logic clarity                     | #110  | ✅ Done   | Already implemented                    |
| Status-based visibility                  | #111  | ✅ Done   |                                        |
| Clear navigation patterns                | #112  | ✅ Done   | PR #169                                |
| No blocking UX friction                  | #113  | ✅ Done   |                                        |
| Leader-friendly flows                    | #114  | ✅ Done   |                                        |

**Epic:** #137 (Closed)

**Design Decisions (Updated Jan 23, 2026):**

- **No default district** — App opens to full map view
- **No view mode selector** — View scope is automatic based on signed-in user's role:
  - Campus user → sees their campus
  - District user → sees their district
  - Regional user → sees their region
  - National/Admin → sees everything

---

### � Phase 3: Authentication & Authorization (IN PROGRESS)

**Goal:** Lock down access after UX is stable.

| Item                         | Issue | Status  | Notes       |
| ---------------------------- | ----- | ------- | ----------- |
| Login flow                   | #115  | ✅ Done | Implemented |
| Session management           | #116  | ✅ Done | Implemented |
| Logout flow                  | #117  | 📋 Todo | Remaining   |
| Role definitions             | #118  | ✅ Done | Implemented |
| Role-based view gating       | #119  | ✅ Done | Implemented |
| Permission enforcement       | #120  | ✅ Done | Implemented |
| View access control          | #121  | 📋 Todo | Remaining   |
| Data visibility by role      | #122  | ✅ Done | Implemented |
| Auth enforcement consistency | #123  | ✅ Done | Implemented |

**Progress:** 7/9 tasks done (78%)

**Epic:** #138

**Roles (implemented):**

- Campus Director — sees their campus only
- District Director — sees all campuses in their district
- Region Director — sees all districts in their region
- Admin / National — sees everything

---

### 📋 Phase 4: Mobile Optimization (QUEUED)

**Goal:** Adapt to mobile after desktop is complete.

| Item                       | Issue | Status  | Notes       |
| -------------------------- | ----- | ------- | ----------- |
| Responsive layout          | #124  | ✅ Done | Implemented |
| Mobile panel behavior      | #125  | 📋 Todo | Remaining   |
| Touch-friendly spacing     | #126  | 📋 Todo | Remaining   |
| Min touch targets (44x44)  | #127  | 📋 Todo | Remaining   |
| Swipe gestures             | #128  | 📋 Todo | Remaining   |
| Mobile controls            | #129  | 📋 Todo | Remaining   |
| Mobile status updates      | #130  | 📋 Todo | Remaining   |
| Mobile notes entry         | #131  | 📋 Todo | Remaining   |
| Mobile needs tracking      | #132  | 📋 Todo | Remaining   |
| Mobile follow-up usability | #133  | 📋 Todo | Remaining   |

**Progress:** 1/10 tasks done (10%)

**Epic:** #139

---

## Current Open Issues (Non-Phase)

## Current Open Issues (Non-Phase)

| Issue | Title                          | Priority |
| ----- | ------------------------------ | -------- |
| #192  | [Epic] Test Coverage Expansion | High     |
| #85   | Reduce Playwright smoke flake  | Medium   |
| #77   | Deployed staging smoke check   | Medium   |
| #76   | Post-merge verification gates  | Medium   |

---

## Complete Issue Index

### Summary

| Phase     | Epic | Done | Todo | Total | Progress |
| --------- | ---- | ---- | ---- | ----- | -------- |
| Phase 1   | #135 | ✅   | -    | -     | 100%     |
| Phase 1.2 | #136 | 3    | 0    | 3     | 100%     |
| Phase 2   | #137 | 12   | 0    | 12    | 100%     |
| Phase 3   | #138 | 7    | 2    | 9     | 78%      |
| Phase 4   | #139 | 1    | 9    | 10    | 10%      |
| Infra     | #192 | 0    | 4    | 4     | 0%       |
| **Total** |      | 23   | 15   | 38    | **61%**  |

### All Issues by Phase

| #       | Title                                  | Phase     | Type         | Status         | Milestone |
| ------- | -------------------------------------- | --------- | ------------ | -------------- | --------- |
| **135** | Epic: Phase 1 Core System Integrity    | Phase 1   | Epic         | ✅ Done        | -         |
| **136** | Epic: Phase 1.2 Cross-View Consistency | Phase 1.2 | Epic         | ✅ Done        | -         |
| 81      | Status propagation tests               | Phase 1.2 | Verification | ✅ Done        | Phase 1.2 |
| 87      | Follow-Up consistency tests            | Phase 1.2 | Verification | ✅ Done        | Phase 1.2 |
| 102     | Map ↔ Panel state sync                | Phase 1.2 | Task         | ✅ Done        | Phase 1.2 |
| **137** | Epic: Phase 2 Desktop UX & Navigation  | Phase 2   | Epic         | ✅ Done        | -         |
| 103     | Default regional scope (TEXICO)        | Phase 2   | Task         | ✅ Done        | Phase 2   |
| 104     | ~~Default district panel~~             | Phase 2   | Task         | ❌ Closed      | Phase 2   |
| 105     | ~~View mode selector~~                 | Phase 2   | Task         | ❌ Closed      | Phase 2   |
| 106     | Stable panel open/close                | Phase 2   | Task         | ✅ Done        | Phase 2   |
| 107     | Smooth panel transitions               | Phase 2   | Task         | ✅ Done        | Phase 2   |
| 108     | Panel state persistence                | Phase 2   | Task         | ✅ Done        | Phase 2   |
| 109     | District-level needs                   | Phase 2   | Task         | ✅ Done        | Phase 2   |
| 110     | Filter logic clarity                   | Phase 2   | Task         | ✅ Done        | Phase 2   |
| 111     | Status-based visibility                | Phase 2   | Task         | ✅ Done        | Phase 2   |
| 112     | Clear navigation patterns              | Phase 2   | Task         | ✅ Done        | Phase 2   |
| 113     | No blocking UX friction                | Phase 2   | Task         | ✅ Done        | Phase 2   |
| 114     | Leader-friendly flows                  | Phase 2   | Task         | ✅ Done        | Phase 2   |
| **138** | Epic: Phase 3 Auth & Authorization     | Phase 3   | Epic         | 🔄 In Progress | -         |
| 115     | Login flow                             | Phase 3   | Task         | ✅ Done        | Phase 3   |
| 116     | Session management                     | Phase 3   | Task         | ✅ Done        | Phase 3   |
| 117     | Logout flow                            | Phase 3   | Task         | 📋 Todo        | Phase 3   |
| 118     | Role definitions                       | Phase 3   | Task         | ✅ Done        | Phase 3   |
| 119     | Role-based view gating                 | Phase 3   | Task         | ✅ Done        | Phase 3   |
| 120     | Permission enforcement                 | Phase 3   | Task         | ✅ Done        | Phase 3   |
| 121     | View access control                    | Phase 3   | Task         | 📋 Todo        | Phase 3   |
| 122     | Data visibility by role                | Phase 3   | Task         | ✅ Done        | Phase 3   |
| 123     | Auth enforcement consistency           | Phase 3   | Task         | ✅ Done        | Phase 3   |
| **139** | Epic: Phase 4 Mobile Optimization      | Phase 4   | Epic         | 📋 Todo        | -         |
| 124     | Responsive layout                      | Phase 4   | Task         | ✅ Done        | Phase 4   |
| 125     | Mobile panel behavior                  | Phase 4   | Task         | 📋 Todo        | Phase 4   |
| 126     | Touch-friendly spacing                 | Phase 4   | Task         | 📋 Todo        | Phase 4   |
| 127     | Min touch targets (44x44)              | Phase 4   | Task         | 📋 Todo        | Phase 4   |
| 128     | Swipe gestures                         | Phase 4   | Task         | 📋 Todo        | Phase 4   |
| 129     | Mobile controls                        | Phase 4   | Task         | 📋 Todo        | Phase 4   |
| 130     | Mobile status updates                  | Phase 4   | Task         | 📋 Todo        | Phase 4   |
| 131     | Mobile notes entry                     | Phase 4   | Task         | 📋 Todo        | Phase 4   |
| 132     | Mobile needs tracking                  | Phase 4   | Task         | 📋 Todo        | Phase 4   |
| 133     | Mobile follow-up usability             | Phase 4   | Task         | 📋 Todo        | Phase 4   |
| **192** | Epic: Test Coverage Expansion          | Infra     | Epic         | 📋 Todo        | -         |
| 76      | Post-merge verification gates          | Infra     | Task         | 📋 Todo        | -         |
| 77      | Deployed staging smoke check           | Infra     | Task         | 📋 Todo        | -         |
| 85      | Reduce Playwright smoke flake          | Infra     | Task         | 📋 Todo        | -         |

---

## Labels Reference

| Label                                                       | Purpose                |
| ----------------------------------------------------------- | ---------------------- |
| `epic`                                                      | Groups related tasks   |
| `build-map`                                                 | Build Map roadmap item |
| `phase:1` / `phase:1.2` / `phase:2` / `phase:3` / `phase:4` | Phase assignment       |
| `priority:high` / `priority:medium` / `priority:low`        | Priority level         |
| `type:feature` / `type:fix` / `type:docs`                   | Issue type             |
| `verify:v0` / `verify:v1` / `verify:v2`                     | Verification level     |
| `role:builder` / `role:verifier` / `role:browser`           | Work type              |

---

## Commands

| Command            | Purpose             |
| ------------------ | ------------------- |
| `pnpm dev`         | Start dev server    |
| `pnpm check`       | TypeScript check    |
| `pnpm test`        | Run unit tests      |
| `pnpm e2e`         | Run E2E smoke tests |
| `pnpm lint`        | Lint code           |
| `pnpm db:setup`    | Full local DB setup |
| `pnpm db:push:yes` | Push schema changes |
| `pnpm db:seed`     | Seed database       |
| `pnpm db:reset`    | Reset database      |

---

## Links

- **Project Board:** https://github.com/users/sirjamesoffordii/projects/2
- **Staging URL:** https://cmc-go-github-staging-staging.up.railway.app
- **Agent Manual:** [AGENTS.md](../../AGENTS.md)
- **Patterns:** [.github/agents/CMC_GO_PATTERNS.md](../../.github/agents/CMC_GO_PATTERNS.md)
