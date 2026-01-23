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

### 📋 Phase 3: Authentication & Authorization (NEXT)

**Goal:** Lock down access after UX is stable.

| Item                         | Issue | Status  |
| ---------------------------- | ----- | ------- |
| Login flow                   | #115  | 📋 Todo |
| Session management           | #116  | 📋 Todo |
| Logout flow                  | #117  | 📋 Todo |
| Role definitions             | #118  | 📋 Todo |
| Role-based view gating       | #119  | 📋 Todo |
| Permission enforcement       | #120  | 📋 Todo |
| View access control          | #121  | 📋 Todo |
| Data visibility by role      | #122  | 📋 Todo |
| Auth enforcement consistency | #123  | 📋 Todo |

**Epic:** #138

**Roles (planned):**

- Campus Director — sees their campus only
- District Director — sees all campuses in their district
- Region Director — sees all districts in their region
- Admin / National — sees everything

---

### 📋 Phase 4: Mobile Optimization (QUEUED)

**Goal:** Adapt to mobile after desktop is complete.

| Item                       | Issue | Status  |
| -------------------------- | ----- | ------- |
| Responsive layout          | #124  | 📋 Todo |
| Mobile panel behavior      | #125  | 📋 Todo |
| Touch-friendly spacing     | #126  | 📋 Todo |
| Min touch targets (44x44)  | #127  | 📋 Todo |
| Swipe gestures             | #128  | 📋 Todo |
| Mobile controls            | #129  | 📋 Todo |
| Mobile status updates      | #130  | 📋 Todo |
| Mobile notes entry         | #131  | 📋 Todo |
| Mobile needs tracking      | #132  | 📋 Todo |
| Mobile follow-up usability | #133  | 📋 Todo |

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
