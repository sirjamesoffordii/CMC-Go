# `.github/` — GitHub control center

This folder contains (1) GitHub automation and (2) the **active** agent docs.

These docs are written for agents. In a hands-off workflow the operator primarily labels Issues to route work and approves/merges PRs when gates pass.

## Mental model

- Issue templates define *work intake*
- `AGENTS.md` defines *how we operate*
- `.github/agents/*` defines *product + role intent*
- `.github/prompts/*` defines *session activation text*
- `.github/workflows/*` defines *automation*

## Read-first (fast)

- Policy: `AGENTS.md`
- Product snapshot: `.github/agents/CMC_GO_BRIEF.md`
- Role docs: `.github/agents/tech-lead.agent.md`, `.github/agents/software-engineer.agent.md`
- Prompts: `.github/prompts/tech-lead.prompt.md`, `.github/prompts/software-engineer.prompt.md`, `.github/prompts/loop.prompt.md`

When needed:
- Archived runbooks index: `.github/_unused/docs/agents/runbook/RUNBOOK_INDEX.md`

## Contents

- `.github/agents/` — active role + brief docs
- `.github/prompts/` — activation prompts (TL/SWE/loop)
- `.github/workflows/` — GitHub Actions
- `.github/ISSUE_TEMPLATE/` — Issue templates
- `.github/copilot-instructions.md` — extra Copilot guidance (kept short)
- `.github/_unused/` — archived artifacts (not active policy)
