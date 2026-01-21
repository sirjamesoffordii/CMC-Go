---
name: Feature / Fix Task
about: Standard work item for universal agents (Alpha/Bravo) + peer verification
title: "[Task] <short title>"
labels: ["status:ready"]
---

## Goal

## Acceptance Criteria
- [ ]

## Surface Area (files/modules)

## Claim / Owner

- Claimed by: (Alpha/Bravo)
- Worktree/branch:

## Verify Level

- L0 (self) | L1 (peer) | L2 (deep)

## Verification Steps
Commands to run:
- `pnpm check`
- `pnpm test`
- If UI flow changed: `pnpm -s playwright test e2e/smoke.spec.ts`

Manual checks:
- 

## Reporting
- Implementation agent posts progress + PR link.
- If Verify Level is L1/L2: a second agent posts commands run + evidence + verdict.
