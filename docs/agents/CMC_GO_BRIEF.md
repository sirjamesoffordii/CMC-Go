# CMC Go — Canonical System Brief
(Overview · Playbook · Build Direction)

This document is the **single authoritative mental model** for autonomous work on CMC Go.
It is written for **AI agents**, not humans.

---

## System Definition

CMC Go is a **map-first mobilization system** for coordinating regions, districts,
campuses, and people around Chi Alpha moments.

Core objective:
- Safely determine who can act, see, and decide at each scope

---

## Core Invariants

### Hierarchy
Region → District → Campus → Person

This hierarchy governs:
- Data models
- Permissions
- Queries
- UI flows

### Server Authority
- Permissions are enforced server-side
- UI never invents access
- Client-only hiding is a defect

### Map as State
- Map selection defines scope
- Scope constrains queries and UI
- Server truth overrides UI

### Data Sensitivity
- People data is restricted by default
- Leaks are severity-one failures

---

## Learned Truths (Playbook)

- Coherence beats speed long-term
- The system must always tell the truth
- Auth is structural, not a feature
- State must be explicit and traceable

If state or permissions are confusing, they are wrong.

---

## Development Heuristics

Priority order:
1. Correctness
2. Visibility & auth integrity
3. Data consistency
4. Workflow clarity
5. Operator confidence
6. UI polish
7. Performance

Prefer:
- Small diffs
- Backend truth
- Fixes over features

Avoid:
- Broad refactors
- UI masking backend issues
- Premature abstractions

---

## Build Phases & Tracking

Detailed phase definitions and historical phase notes are in **[docs/legacy/authority/BUILD_MAP.md](../legacy/authority/BUILD_MAP.md)**.

Day-to-day execution tracking is in the Projects v2 operational board:
https://github.com/users/sirjamesoffordii/projects/2

The build progresses through phases: System Integrity → Core Workflows → Operator Experience → Observability & Safety → Polish & Performance.

We do not skip phases. We do not declare a phase complete until all tasks are verified.

---

## Agent Success Criteria

The system is improving when:
- Behavior is predictable
- Permissions are reliable
- The map matches reality
- Leaders trust the data

Failure modes:
- "It mostly works"
- Hidden assumptions
- Silent errors

---

**Final Rule:** Clarity compounds. Confusion multiplies.
