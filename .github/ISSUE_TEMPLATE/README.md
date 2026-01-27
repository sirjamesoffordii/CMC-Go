# `.github/ISSUE_TEMPLATE/` — Issue Templates

These templates keep Issues consistent so TL can make them executable and SWE can implement with evidence.

## Template Selection Guide

| Template                                 | When to Use                            | Complexity |
| ---------------------------------------- | -------------------------------------- | ---------- |
| **🚀 Feature / Task** (`feature.yml`)    | New functionality, significant changes | 3-6        |
| **🐛 Bug Report** (`bug.yml`)            | Something broken, errors, regressions  | Varies     |
| **✅ Quick Task** (`task.yml`)           | Simple, well-defined work              | 0-2        |
| **🔍 Verification** (`verification.yml`) | Review/verify a PR                     | N/A        |
| **🔬 Spike / Research** (`spike.yml`)    | Time-boxed exploration                 | N/A        |
| **⚙️ Ops Task** (`ops_task.md`)          | Railway/Sentry/Codecov console tasks   | 0-2        |

## Required Sections (for implementation issues)

Every implementation Issue must have:

- **Goal** — One sentence describing the change
- **Surface Area** — Specific files to modify
- **Acceptance Criteria** — Observable outcomes
- **Verification** — Commands to run
- **Complexity Score** — For agent routing (0-6)

## YAML vs Markdown Templates

- **YAML templates** (`.yml`) — New format with forms, validation, dropdowns (preferred)
- **Markdown templates** (`.md`) — Legacy format (feature_task.md, bug_report.md, ops_task.md)

## Complexity Scoring → Agent Routing

| Score | Calculation                                 | Agent               |
| ----- | ------------------------------------------- | ------------------- |
| 0-2   | Low risk + 1 file + clear spec              | Self or Local SE    |
| 3-4   | Medium risk/scope/ambiguity                 | Local SE (GPT-5.2)  |
| 5-6   | High risk + many files + exploration needed | Local SE (Opus 4.5) |

See AGENTS.md for full scoring criteria.

## Archived Templates

Role-specific templates (Builder/Verifier/Explorer/Coordinator/Browser) are archived under `.github/_unused/issue_templates/` — superseded by TL/SWE model.

## See Also

- [AGENTS.md](/AGENTS.md) — Agent operating manual
- [tech-lead.agent.md](/.github/agents/tech-lead.agent.md) — TL Issue creation guidance
