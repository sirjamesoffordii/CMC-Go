# Issue Discovery — Agent Work Queue

Authority: `docs/authority/CMC_GO_COORDINATOR.md`

Agents discover work via **GitHub Issues** filtered by the role label.

## Role label filters

- Coordinator: https://github.com/sirjamesoffordii/CMC-Go/issues?q=is%3Aissue+is%3Aopen+label%3A%22role%3Acoordinator%22
- Explorer: https://github.com/sirjamesoffordii/CMC-Go/issues?q=is%3Aissue+is%3Aopen+label%3A%22role%3Aexplorer%22
- Builder: https://github.com/sirjamesoffordii/CMC-Go/issues?q=is%3Aissue+is%3Aopen+label%3A%22role%3Abuilder%22
- Verifier: https://github.com/sirjamesoffordii/CMC-Go/issues?q=is%3Aissue+is%3Aopen+label%3A%22role%3Averifier%22
- Browser: https://github.com/sirjamesoffordii/CMC-Go/issues?q=is%3Aissue+is%3Aopen+label%3A%22role%3Abrowser%22

## Creating the initial issues

Use `scripts/create-agent-issues.ps1`.

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
  - Install + login: [docs/runbooks/GITHUB_AUTH.md](../runbooks/GITHUB_AUTH.md)
  - Then run: `powershell -NoProfile -File scripts/create-agent-issues.ps1 -Mode gh`

  If you want the terminal to prompt you each time (no env vars):
  - `powershell -NoProfile -File scripts/run-create-agent-issues-rest.ps1`

  Notes:
  - If you run `-Mode rest` without `GITHUB_TOKEN`, the script will prompt: "Paste GitHub token (input hidden)".
  - Never print/log tokens, and never write tokens into repo files.
