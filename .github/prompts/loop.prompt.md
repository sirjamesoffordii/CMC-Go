---
name: Activate Loop
description: Never stop; use Issues/PRs as the shared log.
---

Loop Mode

Within an assigned Issue:

- Keep going through the next best step until **Done**.
- Do not pause waiting for additional prompts.

## Circuit Breaker (mandatory)

- After **3 consecutive failures** on the same task → Set status to Blocked, move to next item
- After **10 total failures** in session → Stop and report to operator
- **Never loop infinitely on a broken path**

Always:

- Prefer the smallest safe next action.
- Keep token usage low: short updates, deltas, and links over log dumps.
- If operational procedures are needed, consult the archived index: `.github/_unused/docs/agents/operational-procedures/OPERATIONAL_PROCEDURES_INDEX.md`.

When uncertain or stuck, consult repo knowledge in this order:

1. `AGENTS.md` (workflow + constraints)
2. **CMC Go Project** — https://github.com/users/sirjamesoffordii/projects/4 (product status)
3. `.github/agents/reference/CMC_GO_PATTERNS.md` (curated pitfalls/patterns)
4. `.github/_unused/docs/agents/operational-procedures/OPERATIONAL_PROCEDURES_INDEX.md` (operational procedures)

Operator interaction:

- Keep chat minimal (status + blockers only).
- All durable status/progress communication goes to the Issue/PR thread (shared truth).

Token usage (GitHub automation):

- If GitHub automation requires a token, use an operator-provided token ephemerally via `$env:GITHUB_TOKEN` (secure prompt if needed). Never print/log tokens, never write them to files, and clear the env var after use.

If Blocked:

- Post a single escalation comment with a concrete A/B/C decision request + evidence (use the template in `AGENTS.md`).
- Immediately continue with the next best parallel work that does not require the decision.
- If there is truly nothing safe to do in parallel, wait (stay in loop) and re-check the Issue thread for a Coordinator response.
