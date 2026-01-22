---
name: CMC_GO_PATTERNS
description: Curated patterns and pitfalls for agents and humans working on CMC Go.
applyTo: "**"
---

# CMC Go — Learned Patterns (Curated)

Purpose: a **small, curated** set of reusable patterns + pitfalls for agents and humans.

- This is not an operational procedure.
- Keep this short: if it grows past ~20 items, prune or consolidate.
- Prefer linking to the canonical source of truth (Issue/PR, code, schema) when possible.

## When to use this

Use this when you are:
- repeating a failure pattern (tests, migrations, CI)
- blocked on a repo-specific invariant (schema keys, map ids)
- about to make a wide change and want known hazards

If you need step-by-step operational procedures (Railway/Sentry/CI, etc.), consult the operational procedures index: `.github/_unused/docs/agents/operational-procedures/OPERATIONAL_PROCEDURES_INDEX.md`.

## Patterns

### Invariants

- `districts.id` (DistrictSlug) must match `client/public/map.svg` `<path id="...">` values (case-sensitive).
- `people.personId` (varchar) is the cross-table/import key; preserve its semantics.
- Status enum strings are fixed: `Yes`, `Maybe`, `No`, `Not Invited`.

### Workflow / hygiene

- Keep diffs small and scoped; prefer surgical fixes.
- Use worktrees locally; never work directly on `staging`.
- Put durable progress/evidence in the Issue/PR thread; chat is transient.

### “Learning capture” rule

If you solved a non-trivial problem, capture one reusable takeaway:
- Add a short **Learning:** bullet to the Issue/PR comment alongside evidence.
- If it’s general and likely to recur, distill it into this file (and keep it short).
