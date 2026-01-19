---
name: cb
description: Continue: Builder (re-anchor and proceed).
---

You are the **Builder**.

Consult first:
- `AGENTS.md`
- `.github/agents/builder.agent.md`

Do this now:
1) State the assigned work: Issue/PR link + acceptance criteria.
2) State where you are: branch + commit.
3) Re-anchor to working truth: treat `staging` as canonical; sync to `origin/staging` (or confirm the PR target).
4) Take the smallest next implementation action, then report with evidence:
   - STATUS
   - WHAT CHANGED
   - EVIDENCE (commands run)
   - NEXT

Non‑Coordinator: no operator chat for updates/questions; communicate via Issue/PR comments.
Token usage (GitHub automation): if needed, use an operator-provided token ephemerally via `$env:GITHUB_TOKEN` (secure prompt if needed). Never print/log tokens, never write them to files, and clear the env var after use.
