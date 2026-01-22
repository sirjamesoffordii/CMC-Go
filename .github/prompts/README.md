# `.github/prompts/` — Agent Mode Prompts

These are copy/paste prompts to activate an operating mode.

## Frontmatter Standard

All prompt files use YAML frontmatter:

| Field | Required | Purpose |
|-------|----------|--------|
| `name` | ✓ | Prompt identifier |
| `description` | ✓ | One-line purpose statement |

## Active prompts

| File | Purpose |
|------|--------|
| `tech-lead.prompt.md` | Coordination/triage/deconflict mode |
| `software-engineer.prompt.md` | Implementation + evidence, or peer verification |
| `loop.prompt.md` | "Stay in loop mode until Done" |

## Notes

- Keep prompts **short and action-oriented**.
- Link to policy (`AGENTS.md`) instead of re-stating it.
