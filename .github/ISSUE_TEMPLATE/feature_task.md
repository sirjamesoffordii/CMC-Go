---
name: Feature / Fix Task
about: Standard work item for TL/SWE + peer verification
title: "[Task] <short title>"
labels: ["status:ready"]
---

## Goal

<!-- One sentence: what user-visible or system behavior changes -->

## Behavioral Spec

<!-- Delete this section for trivial changes -->

- **Trigger:** <!-- What causes this behavior (route, click, API call) -->
- **Before:** <!-- Current behavior (or "does not exist") -->
- **After:** <!-- Expected behavior with specific values/states -->
- **Edge cases:** <!-- What takes precedence, error states -->

## Surface Area

<!-- Files likely to change — helps agent find the right code -->

Files:

- `path/to/file.tsx` — <!-- what changes -->

Pattern to follow:

- <!-- Reference similar existing code, e.g., "see selectedDistrictId in Home.tsx" -->

Existing tests:

- `server/foo.test.ts` — <!-- add case for X, or "no changes needed" -->

## Constraints

<!-- What must NOT break -->

- <!-- Existing behavior X must continue working -->
- `pnpm check` must pass
- `pnpm test` must pass (56 tests currently)

## Acceptance Criteria

- [ ] <!-- Specific observable outcome 1 -->
- [ ] <!-- Specific observable outcome 2 -->
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes

## Verification

```bash
pnpm check && pnpm test
```

Manual (if UI changed):

1. <!-- Step -->
2. <!-- Observe -->

## Project Fields (set in Projects v2)

<!-- Update these in the project board: https://github.com/users/sirjamesoffordii/projects/4 -->

- **Status:** Todo → In Progress → Verify → Done
- **Phase:** <!-- Phase 1 / 1.2 / 2 / 3 / 4 -->
- **Workstream:** <!-- Map / Panel / Follow-Up / Server / DB / Docs/Workflow / Infra/Deploy -->
- **Verify Level:** <!-- L0 (self) / L1 (peer) / L2 (peer + evidence) -->
- **Item Type:** Task

## Claim / Owner

- Claimed by: <!-- TL/SWE — also assign yourself in Projects -->
- Worktree/branch: <!-- wt-impl-XXX-slug or agent/swe/XXX-slug -->

## Agent Routing (optional)

- `agent:se` — implementation
- `agent:tl` — triage/coordination
