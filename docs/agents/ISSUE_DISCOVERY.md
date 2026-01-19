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

- Create issues via GitHub REST API (idempotent, creates missing `role:*` labels):
  - Set `GITHUB_TOKEN` (fine-grained PAT with Issues: Read/Write), then:
  - `powershell -NoProfile -File scripts/create-agent-issues.ps1 -Mode rest`

  If you want the terminal to prompt you each time (no env vars):
  - `powershell -NoProfile -File scripts/run-create-agent-issues-rest.ps1`

  Notes:
  - If you run `-Mode rest` without `GITHUB_TOKEN`, the script will prompt: "Paste GitHub token (input hidden)".
  - Don’t put the token in the prompt string (e.g. `Read-Host "<token>" ...`) — paste it when prompted.

- Create issues via GitHub CLI:
  - Install `gh` and authenticate (`gh auth login`), then:
  - `powershell -NoProfile -File scripts/create-agent-issues.ps1 -Mode gh`
