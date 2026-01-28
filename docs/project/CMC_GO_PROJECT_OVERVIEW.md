# CMC Go — Project Overview

> **Last Updated:** January 27, 2026  
> **Project Board:** https://github.com/users/sirjamesoffordii/projects/4

---

## What is CMC Go?

CMC Go is a **map-first coordination app** for managing CMC (Chi Alpha Campus Ministries) conference attendance. It helps regional and district leaders track people, campuses, and follow-up needs across Texas.

### Core Concept

- **Map View** — Interactive SVG map of Texas districts; click a district to see details
- **Panel View** — Side panel shows people, campuses, and needs for selected district
- **Follow-Up View** — Aggregated view of people with active needs requiring attention
- **Role-Based Access** — Users see data scoped to their role (Campus → District → Region → National)

---

## How We Track Work

### Two Concepts (Simple)

| Concept       | Purpose                          | GitHub Feature |
| ------------- | -------------------------------- | -------------- |
| **Milestone** | When — delivery timeline         | Milestones     |
| **Epic**      | What — multi-task feature groups | Issues + label |

### Milestones (Sequential Releases)

| Milestone              | Focus                                 | Status    |
| ---------------------- | ------------------------------------- | --------- |
| v1.0: Core System      | Schema, flows, state, observability   | ✅ Done   |
| v1.1: Cross-View       | Map ↔ Panel ↔ Follow-Up consistency | ✅ Done   |
| v1.2: Desktop UX       | Navigation, filters, panel behavior   | ✅ Done   |
| v1.3: Authentication   | Login, sessions, roles, permissions   | ✅ Done   |
| v1.4: Mobile           | Responsive layout, touch optimization | ✅ Done   |
| v1.5: Data Management  | Campus ops, deposit tracking, UI      | ✅ Done   |
| v1.6: Production Ready | Migrations, polish, Follow-Up filters | 🔄 Active |

### Epics (Feature Groups)

Epics group related tasks that may span milestones:

| Epic                          | Issue | Status  |
| ----------------------------- | ----- | ------- |
| Epic: Test Coverage Expansion | #192  | 📋 Open |

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

## Data Model

```
Regions
  └── Districts (map to SVG paths)
        └── Campuses
              └── People
                    ├── Notes (typed: general, follow-up, etc.)
                    └── Needs (active/resolved)
```

---

## Milestone Details

### ✅ v1.0: Core System Integrity (COMPLETE)

Foundation work — schema, core flows, state management, observability.

| Area                          | Status  |
| ----------------------------- | ------- |
| Schema finalized              | ✅ Done |
| Core flows (list/detail/edit) | ✅ Done |
| State management (URL params) | ✅ Done |
| Follow-up view                | ✅ Done |
| Observability (Sentry)        | ✅ Done |

---

### ✅ v1.1: Cross-View Consistency (COMPLETE)

All views stay in sync; no desync edge cases.

| Task                        | Issue | Status  |
| --------------------------- | ----- | ------- |
| Map ↔ Panel state sync     | #102  | ✅ Done |
| Status propagation tests    | #81   | ✅ Done |
| Follow-Up consistency tests | #87   | ✅ Done |

---

### ✅ v1.2: Desktop UX (COMPLETE)

Efficient, intuitive desktop experience.

| Task                            | Issue | Status    | Notes                          |
| ------------------------------- | ----- | --------- | ------------------------------ |
| Default regional scope (TEXICO) | #103  | ✅ Done   | PR #160                        |
| ~~Default district panel~~      | #104  | ❌ Closed | Design: default = whole map    |
| ~~View mode selector~~          | #105  | ❌ Closed | Design: automatic by user role |
| Stable panel open/close         | #106  | ✅ Done   |                                |
| Smooth panel transitions        | #107  | ✅ Done   |                                |
| Panel state persistence         | #108  | ✅ Done   |                                |
| District-level needs            | #109  | ✅ Done   |                                |
| Filter logic clarity            | #110  | ✅ Done   |                                |
| Status-based visibility         | #111  | ✅ Done   |                                |
| Clear navigation patterns       | #112  | ✅ Done   |                                |
| No blocking UX friction         | #113  | ✅ Done   |                                |
| Leader-friendly flows           | #114  | ✅ Done   |                                |

**Design Decisions:**

- **No default district** — App opens to full map view
- **No view mode selector** — View scope automatic based on user role

---

### 🔄 v1.3: Authentication (COMPLETE)

Lock down access after UX is stable.

| Task                         | Issue | Status  |
| ---------------------------- | ----- | ------- |
| Login flow                   | #115  | ✅ Done |
| Session management           | #116  | ✅ Done |
| Logout flow                  | #117  | ✅ Done |
| Role definitions             | #118  | ✅ Done |
| Role-based view gating       | #119  | ✅ Done |
| Permission enforcement       | #120  | ✅ Done |
| View access control          | #121  | ✅ Done |
| Data visibility by role      | #122  | ✅ Done |
| Auth enforcement consistency | #123  | ✅ Done |

**Roles:**

- Campus Director → sees their campus only
- District Director → sees all campuses in their district
- Region Director → sees all districts in their region
- Admin / National → sees everything

---

### ✅ v1.4: Mobile (COMPLETE)

Responsive layout, touch optimization.

| Task                       | Issue | Status  |
| -------------------------- | ----- | ------- |
| Responsive layout          | #124  | ✅ Done |
| Mobile panel behavior      | #125  | ✅ Done |
| Touch-friendly spacing     | #126  | ✅ Done |
| Min touch targets (44x44)  | #127  | ✅ Done |
| Swipe gestures             | #128  | ✅ Done |
| Mobile controls            | #129  | ✅ Done |
| Mobile status updates      | #130  | ✅ Done |
| Mobile notes entry         | #131  | ✅ Done |
| Mobile needs tracking      | #132  | ✅ Done |
| Mobile follow-up usability | #133  | ✅ Done |
| Mobile swipe-to-close      | #290  | ✅ Done |

---

### ✅ v1.5: Data Management (COMPLETE)

Campus operations, deposit tracking, and district panel improvements.

| Task                         | Issue | Status  | Notes                             |
| ---------------------------- | ----- | ------- | --------------------------------- |
| Campus management mutations  | #295  | ✅ Done | Archive, reorder, move person     |
| No Campus Assigned row       | #296  | ✅ Done | Shows district-level assignments  |
| Deposit Paid indicator in UI | #297  | ✅ Done | Glow effect for paid deposits     |
| Header image persistence fix | #298  | ✅ Done | Store file key, not presigned URL |
| Settings persistence tests   | #299  | ✅ Done | Test coverage for settings        |
| Docs update for v1.5         | #300  | ✅ Done | Updated project overview          |

---

### 🔄 v1.6: Production Ready (ACTIVE)

Migration rollout, Follow-Up filters, and polish.

| Task                             | Issue | Status  | Notes                            |
| -------------------------------- | ----- | ------- | -------------------------------- |
| Apply migration 0006 to prod     | #306  | 📋 Todo | displayOrder column for campuses |
| Deposit paid filter in Follow-Up | #307  | 📋 Todo | Filter by deposit status         |
| Archived flag for campuses       | #308  | 📋 Todo | Soft delete vs hard delete       |

---

## Infrastructure Tasks (No Milestone)

| Task                          | Issue | Status  |
| ----------------------------- | ----- | ------- |
| Post-merge verification gates | #76   | 📋 Todo |
| Deployed staging smoke check  | #77   | 📋 Todo |
| Reduce Playwright smoke flake | #85   | ✅ Done |
| Epic: Test Coverage Expansion | #192  | ✅ Done |
| Epic: Test Coverage Expansion | #192  | 📋 Open |

---

## Complete Issue Index

### Summary

| Milestone             | Done | Open | Total | Progress |
| --------------------- | ---- | ---- | ----- | -------- |
| v1.0: Core System     | ✅   | -    | -     | 100%     |
| v1.1: Cross-View      | 3    | 0    | 3     | 100%     |
| v1.2: Desktop UX      | 12   | 0    | 12    | 100%     |
| v1.3: Authentication  | 9    | 0    | 9     | 100%     |
| v1.4: Mobile          | 11   | 0    | 11    | 100%     |
| v1.5: Data Management | 2    | 1    | 3     | 67%      |
| Infrastructure        | 2    | 2    | 4     | 50%      |
| **Total**             | 39   | 3    | 42    | **93%**  |

### All Tasks

| #   | Task                            | Milestone | Status  |
| --- | ------------------------------- | --------- | ------- |
| 81  | Status propagation tests        | v1.1      | ✅ Done |
| 87  | Follow-Up consistency tests     | v1.1      | ✅ Done |
| 102 | Map ↔ Panel state sync         | v1.1      | ✅ Done |
| 103 | Default regional scope (TEXICO) | v1.2      | ✅ Done |
| 104 | ~~Default district panel~~      | v1.2      | ❌      |
| 105 | ~~View mode selector~~          | v1.2      | ❌      |
| 106 | Stable panel open/close         | v1.2      | ✅ Done |
| 107 | Smooth panel transitions        | v1.2      | ✅ Done |
| 108 | Panel state persistence         | v1.2      | ✅ Done |
| 109 | District-level needs            | v1.2      | ✅ Done |
| 110 | Filter logic clarity            | v1.2      | ✅ Done |
| 111 | Status-based visibility         | v1.2      | ✅ Done |
| 112 | Clear navigation patterns       | v1.2      | ✅ Done |
| 113 | No blocking UX friction         | v1.2      | ✅ Done |
| 114 | Leader-friendly flows           | v1.2      | ✅ Done |
| 115 | Login flow                      | v1.3      | ✅ Done |
| 116 | Session management              | v1.3      | ✅ Done |
| 117 | Logout flow                     | v1.3      | ✅ Done |
| 118 | Role definitions                | v1.3      | ✅ Done |
| 119 | Role-based view gating          | v1.3      | ✅ Done |
| 120 | Permission enforcement          | v1.3      | ✅ Done |
| 121 | View access control             | v1.3      | ✅ Done |
| 122 | Data visibility by role         | v1.3      | ✅ Done |
| 123 | Auth enforcement consistency    | v1.3      | ✅ Done |
| 124 | Responsive layout               | v1.4      | ✅ Done |
| 125 | Mobile panel behavior           | v1.4      | ✅ Done |
| 126 | Touch-friendly spacing          | v1.4      | ✅ Done |
| 127 | Min touch targets (44x44)       | v1.4      | ✅ Done |
| 128 | Swipe gestures                  | v1.4      | ✅ Done |
| 129 | Mobile controls                 | v1.4      | ✅ Done |
| 130 | Mobile status updates           | v1.4      | ✅ Done |
| 131 | Mobile notes entry              | v1.4      | ✅ Done |
| 132 | Mobile needs tracking           | v1.4      | ✅ Done |
| 133 | Mobile follow-up usability      | v1.4      | ✅ Done |
| 290 | Mobile swipe-to-close panel     | v1.4      | ✅ Done |
| 295 | Campus management mutations     | v1.5      | 📋 Todo |
| 296 | No Campus Assigned row          | v1.5      | ✅ Done |
| 297 | Deposit Paid indicator in UI    | v1.5      | ✅ Done |
| 76  | Post-merge verification gates   | Infra     | 📋 Todo |
| 77  | Deployed staging smoke check    | Infra     | 📋 Todo |
| 85  | Reduce Playwright smoke flake   | Infra     | ✅ Done |
| 192 | Epic: Test Coverage Expansion   | Infra     | ✅ Done |

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

- **Project Board:** https://github.com/users/sirjamesoffordii/projects/4
- **Staging URL:** https://cmc-go-github-staging-staging.up.railway.app
- **Agent Manual:** [AGENTS.md](../../AGENTS.md)
