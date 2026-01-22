---
name: Feature / Fix Task
about: Standard work item for TL/SWE + peer verification
title: "[Task] <short title>"
labels: ["status:ready"]
---

## Goal

## Acceptance Criteria
- [ ]

## Surface Area (files/modules)

## Claim / Owner

- Claimed by: (TL/SWE)
- Worktree/branch:

## Verify Level

Set PR labels (these are enforced by CI):

- `verify:v0` (self)
- `verify:v1` (peer approval required)
- `verify:v2` (peer approval + evidence labels required)

For `verify:v2`, also add evidence labels:

- `evidence:db-or-ci`
- `evidence:deployed-smoke`

## Agent routing (optional)

To trigger the GitHub-hosted Copilot agent, add one label:

- `agent:copilot-swe` (implementation)
- `agent:copilot-tl` (triage/coordination)
- `agent:copilot` (defaults to TL token)

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
