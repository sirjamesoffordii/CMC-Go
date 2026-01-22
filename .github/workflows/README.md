# `.github/workflows/` — GitHub Actions

This folder contains the repo’s GitHub Actions workflows.

## Workflows

| Workflow | Purpose |
|----------|--------|
| `test-and-coverage.yml` | Runs unit tests and code coverage reporting |
| `verification-gate.yml` | Enforces the repo's verification labeling/gate policy |
| `copilot-auto-handoff.yml` | Assigns Issues to Copilot coding agent when labeled |
| `validate-agents.yml` | Validates agent/prompt file frontmatter on PRs |

## Editing rules

- Keep workflows **boring and explicit**.
- When changing agent instructions, prefer updating `AGENTS.md` and linking to it.
- Avoid adding new required secrets unless truly necessary.
