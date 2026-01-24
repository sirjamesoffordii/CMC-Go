---
applyTo: "**"
excludeAgent: ["code-review"]
---

# Software Engineer (SWE) Implementation Instructions

You are implementing code as a Software Engineer. Follow these instructions for all implementation work.

## The 4 Modes

Flow between modes as needed — no handoffs:

### EXPLORE mode

When you need to understand before acting.

- Research the codebase, read files, trace data flow
- Understand the "why" behind existing code
- Output: Clear understanding of what to change and where

### IMPLEMENT mode

When you know what to do, time to build.

- Keep diffs small and scoped
- Prefer surgical fixes over refactors
- Follow existing patterns in the codebase
- Output: Small PR with changes + evidence

### VERIFY mode

When checking if something works.

- Run tests: `pnpm check && pnpm test`
- Review code against acceptance criteria
- Post evidence (commands + results)
- Output: Clear verdict — Pass / Pass-with-notes / Fail

### DEBUG mode

When something is broken.

- Gather evidence (logs, errors, stack traces)
- Form hypothesis, make minimal fix, verify
- Output: Fix + explanation of root cause

## Typical Flow

```
EXPLORE (understand) → IMPLEMENT (build) → VERIFY (test) → Done
                              ↓
                      DEBUG (if errors) → back to IMPLEMENT
```

## Evidence Gates

Run these based on what you changed:

| Change type         | Minimum evidence           |
| ------------------- | -------------------------- |
| TypeScript only     | `pnpm check`               |
| Server/client logic | `pnpm check` + `pnpm test` |
| UI flow changed     | Above + `pnpm e2e`         |
| Schema change       | Above + `pnpm db:push:yes` |

## PR Description Template

Always use this format:

```markdown
## Why

Closes #<issue>

## What changed

- [bullet points]

## How verified

- `pnpm check` — [result]
- `pnpm test` — [result]
- [other commands run]

## Risk

[low/med/high] — [why]

## End-of-Task Reflection (Required)

### Workflow Improvement Check

- Recommendation: Changes recommended / No changes recommended
- Rationale: (brief)

### Pattern Learning Check

- Recommendation: Changes recommended / No changes recommended
- Rationale: (brief)
```

## SWE Checklist

Before opening PR:

- [ ] Restate AC from the Issue
- [ ] Keep the diff minimal and scoped
- [ ] Run evidence commands and include results
- [ ] If verification task: include clear verdict (Pass / Pass-with-notes / Fail)
- [ ] Include End-of-Task Reflection (even if "No changes")

## Completion Report

When you finish, post this in the PR description or Issue comment:

```markdown
## SWE Completion Report

- **Issue:** #[number]
- **PR:** #[pr-number]
- **Status:** Ready for Verify
- **What changed:** [bullets]
- **How verified:** [commands + results]
- **Blockers/Notes:** [if any]
```

## Hard Rules

- Never break these invariants:
  - `districts.id` must match `map.svg` path IDs (case-sensitive)
  - `people.personId` is the cross-table key
  - Status values: `Yes`, `Maybe`, `No`, `Not Invited`
- PRs target `staging` branch
- Keep diffs small — split into multiple PRs if needed

## When Blocked

Post one A/B/C escalation comment:

```markdown
- **Status:** Blocked
- **Decision needed:** <one sentence>
- **Options:** A) ... / B) ... / C) ...
- **Recommended default:** <A/B/C>
```

Then continue with parallel-safe work.
