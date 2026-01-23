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

## Windows / Terminal Self-Recovery

**When you hit "alternate buffer" or stuck terminal:**

1. **First:** Run VS Code task `Agent: Recover terminal` (resets pager env vars).
2. **If still stuck:** Run VS Code task `Agent: Health check` to confirm terminal works.
3. **If health check fails:** Use VS Code tasks exclusively (no `run_in_terminal`).
4. **Last resort:** Escalate to operator only if all tasks also fail.

**Pattern: Prefer tasks over `run_in_terminal` for git/gh commands.**

The workspace has pre-configured tasks that bypass pager issues:

| Symptom                          | Use This Task                |
| -------------------------------- | ---------------------------- |
| `run_in_terminal` hangs on git   | `Git: Status`                |
| Stuck rebase                     | `Git: Rebase abort`          |
| Need to checkout a PR cleanly    | `GH: Checkout PR (clean)`    |
| Need to start fresh on staging   | `Git: Hard reset to staging` |
| Terminal completely unresponsive | `Agent: Recover terminal`    |

**Pattern: When editing tasks.json, read the full file first.**

Partial reads → corrupted JSON. Either:

- Read entire file before editing
- Or use `git checkout -- .vscode/tasks.json` to reset if corrupted

**Pattern: Git operations that may open editors.**

Always use `-c core.editor=true` to prevent hanging:

```bash
git -c core.editor=true rebase --abort
git -c core.editor=true merge --abort
```

The `Git: Rebase onto staging (no editor)` task already does this.

**Escalation threshold:**

- **Do NOT escalate** for terminal/pager issues — use tasks.
- **Do NOT escalate** for stuck rebase — use `Git: Rebase abort` task.
- **DO escalate** if: all recovery tasks fail, or operator login required (gh auth, Railway).
