# AEOS PR Standards

How to document PRs and evidence. Quick reference for copy/paste templates.

---

## Verification Levels

| Level       | Who Verifies       | Evidence Required             |
| ----------- | ------------------ | ----------------------------- |
| `verify:v0` | Author self-verify | Commands + results            |
| `verify:v1` | Someone else       | Approval + evidence           |
| `verify:v2` | Peer + extra       | DB/CI proof OR deployed smoke |

---

## PR Description (minimum)

```markdown
## Why

Link to Issue #X

## What Changed

- Bullet 1
- Bullet 2

## How Verified
```

pnpm check # ✅ passed
pnpm test # ✅ 47/47 passed

```

## Risk
Low / Med / High — because X
```

---

## Evidence Standard

Post in Issues/PRs:

```markdown
- **Status:** In Progress / Blocked / Ready for Verify / Verified
- **Worktree:** `wt-impl-42-feature-name`
- **Branch/PR:** #123
- **What changed:** bullets
- **How verified:** commands + brief results
- **Learning (optional):** one reusable takeaway
- **Notes/Risks:** anything reviewer should know
```

---

## Verification Verdict

When verifying a PR:

```markdown
- **Result:** Pass / Pass-with-notes / Fail
- **Evidence:** commands + key output
- **Notes/Risks:** gaps, flakiness, edge cases
```

---

## End-of-Task Reflection

Every PR includes:

```markdown
## End-of-Task Reflection

- **Workflow:** No changes / [file] — [change]
- **Patterns:** No changes / [file] — [change]
```

**Decision tree (10 seconds max):**

1. Something wasted time? → Edit the doc NOW
2. Solved non-obvious problem? → Add to CMC_GO_PATTERNS.md NOW
3. Neither? → Write "No changes"

**Never defer.** If improvement takes >2 min, log to MCP Memory and continue.

---

## Escalation Template

When blocked:

```markdown
- **Status:** Blocked
- **Decision needed:** <one sentence>
- **Why it matters:** <one sentence>
- **Options:** A) … / B) … / C) …
- **Recommended default (if no response by <time>):** <A/B/C>
- **Evidence:** <links / 3–10 key lines>
- **Parallel work I will do now:** <short list>
```

**Do NOT escalate for:**

- Terminal issues → `Agent: Recover terminal` task
- Stuck rebase → `Git: Rebase abort` task
- Dirty tree → `Git: Hard reset to staging` task

**DO escalate for:**

- All recovery tasks fail
- Security-sensitive choices
- Changes to repo invariants

---

## Low-Risk Fast Path

Allowed when ALL true:

- ≤ ~50 LOC and 1–2 files
- No schema/auth/env changes
- Low collision risk

Procedure:

1. Use docs worktree
2. Open PR with: Why / What changed / How verified / Risk
