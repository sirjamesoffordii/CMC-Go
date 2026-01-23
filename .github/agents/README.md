# `.github/agents/` — Active Agent Docs

This folder contains the **active** product + role docs.

## Frontmatter Standard

All agent files use YAML frontmatter for tooling/validation:

| Field         | Required | Purpose                                 |
| ------------- | -------- | --------------------------------------- |
| `name`        | ✓        | Agent identifier (used in handoffs)     |
| `description` | ✓        | One-line purpose statement              |
| `handoffs`    |          | List of agents this one can delegate to |
| `tools`       |          | Tools this agent typically uses         |
| `applyTo`     |          | Glob pattern for applicable files       |

## Files

| File                         | Purpose                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `CMC_GO_BRIEF.md`            | Product intent + non-negotiable invariants               |
| `CMC_GO_PATTERNS.md`         | Curated pitfalls/patterns (keep short)                   |
| `QUICK_REFERENCE.md`         | One-page cheatsheet (commands, templates, invariants)    |
| `RAILWAY_COMMANDS.md`        | Railway CLI commands for debugging deployments           |
| `tech-lead.agent.md`         | TL responsibilities (triage/coherence/deconflict)        |
| `software-engineer.agent.md` | SWE responsibilities (small diffs + evidence, or verify) |

## Validation

Run `pnpm validate:agents` to check frontmatter.

## Rules

- Operating policy lives in `AGENTS.md`.
- Product intent + invariants live in `CMC_GO_BRIEF.md`.
- Role docs stay short: priorities + outputs + checklists.
