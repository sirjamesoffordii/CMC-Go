# `.github/workflows/` — GitHub Actions

This folder contains the repo’s GitHub Actions workflows.

## Workflows

- `test-and-coverage.yml`
  - Runs unit tests and code coverage reporting.
- `verification-gate.yml`
  - Enforces the repo’s verification labeling/gate policy.
- `copilot-auto-handoff.yml`
  - Assigns Issues to the Copilot coding agent when labeled (e.g. `agent:copilot`).

## Editing rules

- Keep workflows **boring and explicit**.
- When changing agent instructions, prefer updating `AGENTS.md` and linking to it.
- Avoid adding new required secrets unless truly necessary.
