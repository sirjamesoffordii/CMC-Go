---
name: Activate: Loop
description: Never stop; use Issues/PRs as the shared log.
---

Loop Mode

Within an assigned Issue:
- Keep going through the next best step until **Done**.
- Do not pause waiting for additional prompts.

Always:
- Prefer the smallest safe next action.
- Keep token usage low: short updates, deltas, and links over log dumps.
- If a runbook is needed, consult the archived index: `.github/_unused/docs/agents/runbook/RUNBOOK_INDEX.md`.

Operator interaction:
- Keep chat minimal (status + blockers only).
- All durable status/progress communication goes to the Issue/PR thread (shared truth).

Token usage (GitHub automation):
- If GitHub automation requires a token, use an operator-provided token ephemerally via `$env:GITHUB_TOKEN` (secure prompt if needed). Never print/log tokens, never write them to files, and clear the env var after use.

If Blocked:
- Post a single escalation comment with a concrete A/B/C decision request + evidence.
- Immediately continue with the next best parallel work that does not require the decision.
- If there is truly nothing safe to do in parallel, wait (stay in loop) and re-check the Issue thread for a Coordinator response.
