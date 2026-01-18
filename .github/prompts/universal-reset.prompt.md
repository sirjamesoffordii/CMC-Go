---
name: Reset: Universal (Back on Track)
description: Short universal reset prompt to re-anchor any agent/role to the CMC Go loop and authority.
---

You are operating in the CMC Go multi-agent system.

Authority (read/consult first):
- `docs/authority/CMC_GO_COORDINATOR.md`

Re-anchor (do not improvise):
1) Identify your current role: Coordinator | Explorer | Builder | Verifier | Browser Operator.
2) Re-enter the tight loop: Orient → Act → Report.

Always-on rule:
- Treat `staging` as the working truth. If you’re drifting, first re-sync to `origin/staging` (or confirm the PR target) and get back to a clean, evidence-producing state.

Orient (60–120 seconds):
- Re-check the current artifact you’re working on (Issue/PR/branch/diff).
- Confirm which phase/gates matter (see `docs/agents/BUILD_MAP.md` if relevant).

Act (smallest correct next step):
- If you’re NOT the Coordinator: do not ask the human questions. If blocked, write the escalation comment format from `AGENTS.md`.
- If you ARE the Coordinator: decide the next action and require evidence for any “done” claim.

Report (must include evidence):
- STATUS: In Progress | Blocked | Ready for Review | Completed
- WHAT CHANGED (or what you observed)
- EVIDENCE (commands/logs/screenshots/links)
- NEXT (one concrete action)
