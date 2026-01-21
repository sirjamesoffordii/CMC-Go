# Agent Quick Commands (token-saving)

This repo already includes helper scripts in `scripts/`.

## Create role Issues (batch)

- `powershell -NoProfile -File scripts/create-agent-issues.ps1 -Mode gh`

## Post merge/triage evidence (examples)

- `powershell -NoProfile -File scripts/post-merge-evidence.ps1`

## Tip: keep comments short

- Link PR/Issue, include <= 10 relevant lines, and follow `docs/agents/runbook/AGENT_EVIDENCE_STANDARD.md`.

## CI is the gate (recommended commands)

CI (GitHub Actions) is the merge gate for `staging`. Treat PR checks as authoritative.

- Watch checks on a PR: `gh pr checks <pr-number> --watch`
- List recent workflow runs: `gh run list --limit 10`
- Watch a run: `gh run watch <run-id>`
- View logs: `gh run view <run-id> --log`
- Re-run a failed run: `gh run rerun <run-id>`

If you need to manually trigger a workflow:

- List workflows: `gh workflow list`
- Trigger: `gh workflow run "Test and Code Coverage" --ref <branch>`
