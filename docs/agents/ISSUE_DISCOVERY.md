# Issue Discovery — Agent Work Queue

Authority: `docs/authority/CMC_GO_COORDINATOR.md`

Agents discover work via **GitHub Issues** filtered by the role label.

## Role label filters

- Coordinator: https://github.com/sirjamesoffordii/CMC-Go/issues?q=is%3Aissue+is%3Aopen+label%3Arole%3Acoordinator
- Explorer: https://github.com/sirjamesoffordii/CMC-Go/issues?q=is%3Aissue+is%3Aopen+label%3Arole%3Aexplorer
- Builder: https://github.com/sirjamesoffordii/CMC-Go/issues?q=is%3Aissue+is%3Aopen+label%3Arole%3Abuilder
- Verifier: https://github.com/sirjamesoffordii/CMC-Go/issues?q=is%3Aissue+is%3Aopen+label%3Arole%3Averifier
- Browser: https://github.com/sirjamesoffordii/CMC-Go/issues?q=is%3Aissue+is%3Aopen+label%3Arole%3Abrowser

## Creating the initial issues

Use `scripts/create-agent-issues.ps1`.

- Print prefilled “new issue” links (works without `gh`):
  - `powershell -NoProfile -File scripts/create-agent-issues.ps1 -Mode url`
  - Add `-Open` to open each issue creation page in your default browser.

- Create issues via GitHub REST API (idempotent, creates missing `role:*` labels):
  - Set `GITHUB_TOKEN` (fine-grained PAT with Issues: Read/Write), then:
  - `powershell -NoProfile -File scripts/create-agent-issues.ps1 -Mode rest`

- Create issues via GitHub CLI:
  - Install `gh` and authenticate (`gh auth login`), then:
  - `powershell -NoProfile -File scripts/create-agent-issues.ps1 -Mode gh`
