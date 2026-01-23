# GitHub Auth for Automation (Stop Re-Pasting Tokens)

Goal: run CMC-Go automation (issue seeding, posting evidence comments) without repeatedly pasting a PAT.

## Recommended: GitHub CLI (`gh`)

Once `gh` is installed and authenticated, scripts can use your OS-stored auth and won’t need tokens.

### Install (Windows)

Using winget:

- `winget install --id GitHub.cli -e`

If winget isn’t available, install from:

- https://cli.github.com/

### Login

- `gh auth login`

Verify:

- `gh auth status -h github.com`

## Script behavior

- [scripts/create-agent-issues.ps1](../../scripts/create-agent-issues.ps1)
  - Use `-Mode gh` (or `-Mode auto` if you want it to pick gh when available).

- [scripts/post-merge-evidence.ps1](../../scripts/post-merge-evidence.ps1)
  - Prefers `gh` when available.
  - Falls back to a hidden token prompt if `gh` isn’t installed/authenticated.

## Token fallback (ephemeral)

If you must use a PAT, keep it ephemeral:

- Prefer setting it only for the current terminal session (e.g. `$env:GITHUB_TOKEN`) and then clearing it.
- Never commit tokens to the repo.
