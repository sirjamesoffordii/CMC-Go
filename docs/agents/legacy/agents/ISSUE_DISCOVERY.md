# Issue Discovery — Work Queue

Authority: `docs/agents/legacy/CMC_GO_COORDINATOR.md`

Legacy note: predates the current TL/SWE role split. Work discovery is Project-first.

## Primary queue (recommended)

- Use the **GitHub Project (operational board)** as the command center for:
  - status (Todo/In Progress/Blocked/Verify/Done)
  - phase
  - item type

## Secondary queue (Issue search links)

These links are useful when you can’t (or don’t want to) use the Project UI.

- Ready/unclaimed: https://github.com/sirjamesoffordii/CMC-Go/issues?q=is%3Aissue+is%3Aopen+label%3A%22status%3Aready%22+no%3Aassignee
- Claimed by TL: https://github.com/sirjamesoffordii/CMC-Go/issues?q=is%3Aissue+is%3Aopen+label%3A%22claimed%3Atl%22
- Claimed by SWE: https://github.com/sirjamesoffordii/CMC-Go/issues?q=is%3Aissue+is%3Aopen+label%3A%22claimed%3Aswe%22
- Needs verification: https://github.com/sirjamesoffordii/CMC-Go/issues?q=is%3Aissue+is%3Aopen+label%3A%22status%3Averify%22

If you are using multiple GitHub accounts (one per agent), `assignee:<user>` can replace claim labels.

## Creating bootstrap issues (optional)

The script `scripts/create-agent-issues.ps1` is legacy/bootstrap tooling; use it only if you need a starting set of Issues in a fresh repo.

- Print prefilled “new issue” links (works without `gh`):
  - `powershell -NoProfile -File scripts/create-agent-issues.ps1 -Mode url`
  - Add `-Open` to open each issue creation page in your default browser.

- Create issues via GitHub CLI (recommended for persistence):
  - Install `gh` and authenticate once (`gh auth login`), then:
  - `powershell -NoProfile -File scripts/create-agent-issues.ps1 -Mode gh`

- Create issues via GitHub REST API (token-based fallback; idempotent, creates missing `role:*` labels):
  - Set `GITHUB_TOKEN` (fine-grained PAT with Issues: Read/Write) in your **local** environment, then:
  - `powershell -NoProfile -File scripts/create-agent-issues.ps1 -Mode rest`

  If you want to avoid re-pasting tokens, prefer GitHub CLI auth:
  - Install + login: [docs/agents/runbook/GITHUB_AUTH.md](../../runbook/GITHUB_AUTH.md)
  - Then run: `powershell -NoProfile -File scripts/create-agent-issues.ps1 -Mode gh`

  If you want the terminal to prompt you each time (no env vars):
  - `powershell -NoProfile -File scripts/run-create-agent-issues-rest.ps1`

  Notes:
  - If you run `-Mode rest` without `GITHUB_TOKEN`, the script will prompt: "Paste GitHub token (input hidden)".
  - Never print/log tokens, and never write tokens into repo files.
