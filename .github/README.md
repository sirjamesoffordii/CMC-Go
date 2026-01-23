# `.github/` — GitHub control center

This folder contains (1) GitHub automation and (2) the **active** agent docs.

These docs are written for agents. In a hands-off workflow the operator primarily labels Issues to route work and approves/merges PRs when gates pass.

## Mental model

| Folder            | Purpose                                |
| ----------------- | -------------------------------------- |
| `agents/`         | Product + role definitions (who/what)  |
| `prompts/`        | Session activation text (how to start) |
| `ISSUE_TEMPLATE/` | Work intake templates                  |
| `workflows/`      | CI/CD automation                       |
| `_unused/`        | Archived material                      |

## Key files

| File                       | Purpose                                   |
| -------------------------- | ----------------------------------------- |
| `AGENTS.md` (root)         | Operating policy (workflow + constraints) |
| `copilot-instructions.md`  | Auto-injected into Copilot sessions       |
| `PULL_REQUEST_TEMPLATE.md` | Standard PR description format            |

## Read-first (fast)

1. `AGENTS.md`
2. `agents/CMC_GO_BRIEF.md`
3. Your role: `agents/tech-lead.agent.md` or `agents/software-engineer.agent.md`
4. `prompts/loop.prompt.md`

When needed:

- Archived operational procedures: `_unused/docs/agents/operational-procedures/OPERATIONAL_PROCEDURES_INDEX.md`

## Validation

Run `pnpm validate:agents` to validate agent/prompt files.
