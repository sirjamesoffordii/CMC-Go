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

## Claim / Owner

- Claimed by: <!-- TL/SWE -->
- Worktree/branch: <!-- wt-impl-XXX-slug or agent/swe/XXX-slug -->

## Labels

Set PR labels:

- `verify:v0` — self-verify
- `verify:v1` — peer approval required
- `verify:v2` — peer approval + evidence labels

Agent routing (optional):

- `agent:copilot-swe` — implementation
- `agent:copilot-tl` — triage/coordination
