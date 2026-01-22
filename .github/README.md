# `.github/` — Automation + Agent Docs

This folder contains **everything that makes the repo run on GitHub** (workflows, issue templates) plus the **active agent operating docs**.

If you’re wondering “where do I look?” start here:

## Read-first

- Operating manual (source of truth): `AGENTS.md` (repo root)
- Product intent + invariants: `.github/agents/CMC_GO_BRIEF.md`
- Role definitions:
  - `.github/agents/tech-lead.agent.md`
  - `.github/agents/software-engineer.agent.md`
- Prompts (mode activation):
  - `.github/prompts/tech-lead.prompt.md`
  - `.github/prompts/software-engineer.prompt.md`
  - `.github/prompts/loop.prompt.md`

Optional reference (when needed):
- Archived runbooks index: `.github/_unused/docs/agents/runbook/RUNBOOK_INDEX.md`

## What’s in here

- `.github/agents/`
  - **Active** role/brief docs consumed by humans and agents.
- `.github/prompts/`
  - Activation prompts used by Copilot/agents (TL/SWE/loop).
- `.github/workflows/`
  - GitHub Actions workflows (CI, verification gate, Copilot auto-handoff).
- `.github/ISSUE_TEMPLATE/`
  - Issue templates.
- `.github/copilot-instructions.md`
  - Extra, repo-specific Copilot guidance (kept short; `AGENTS.md` is the real policy).
- `.github/_unused/`
  - Archived/legacy artifacts kept for reference.

## Conventions

- **Active policy lives in one place:** `AGENTS.md`.
- Keep docs **linkable and skimmable**:
  - Start with purpose.
  - Use short headings.
  - Avoid duplicating policy between files—link instead.
- If something is no longer active, move it to `.github/_unused/` and add a short note in its README.
