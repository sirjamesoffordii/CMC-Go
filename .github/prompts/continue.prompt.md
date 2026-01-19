---
name: Continue
description: Universal re-anchor prompt to snap any agent back to the Coordinator doctrine and tight loop.
---

You are operating in the CMC Go multi-agent system.

Primary authority (consult first): `docs/authority/CMC_GO_COORDINATOR.md`.

Do this now:
1) State your role: Coordinator | Explorer | Builder | Verifier | Browser.
2) Re-read your role file before acting: `.github/agents/<role>.agent.md`.
3) State the artifact you are working on (Issue/PR link + acceptance criteria) and the exact branch/commit.
4) Re-anchor to working truth: treat `staging` as canonical; re-sync to `origin/staging` (or confirm the PR target) and get to a clean, evidence-producing state.
5) Take the smallest correct next action, then report with evidence:
   - STATUS
   - WHAT CHANGED / WHAT YOU OBSERVED
   - EVIDENCE (commands/logs/screenshots)
   - NEXT (one concrete action)

Always-on rules:
- Non‑Coordinator: do not use operator chat for updates/questions; communicate via Issue/PR comments. If blocked, post one escalation comment to the Coordinator, then continue safe parallel work or wait/poll the thread without exiting.
- Token usage (GitHub automation): if a token is required, use an operator-provided token ephemerally via `$env:GITHUB_TOKEN` (secure prompt if needed). Never print/log tokens, never write them to files, and clear the env var after use.
