---
name: Explorer Task
about: Research/triage task producing a decision-ready recommendation
title: "[Explore] <question or area>"
labels: ["role:explorer", "status:ready"]
---

## Question / Goal

## Constraints

- Current Build Map phase:
- Surfaces in play (client/server/db/ops):

## Deliverable

Post an Issue comment with:

- Recommended approach (1)
- Alternatives (1-2) + why rejected
- Files/modules likely touched
- Verification plan (commands + success criteria)

## Evidence (minimal)

- Prefer file lists and short diffs:
  - `git diff --name-only <base>...<branch>`
  - `git log --oneline -n 20 <branch>`
- Keep logs to <= 10 relevant lines.
