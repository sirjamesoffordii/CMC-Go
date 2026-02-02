# `.github/prompts/` — Agent Mode Prompts

These are VS Code prompts to activate an operating mode. Use them via `/` command in Copilot Chat.

## Agent Activation

**To start AEOS, use:** `/activate Principal Engineer`

| Prompt                         | Purpose                             |
| ------------------------------ | ----------------------------------- |
| `/activate Principal Engineer` | Start PE - monitors, creates issues |
| `/activate Tech Lead`          | Start TL - delegates, reviews PRs   |
| `/activate Software Engineer`  | Start SE - implements in worktree   |

**Canonical activation message (used by all methods):**

```
You are <Role> 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW.
```

## Other prompts

| File                         | Purpose                        |
| ---------------------------- | ------------------------------ |
| `loop.prompt.md`             | "Stay in loop mode until Done" |
| `verify-pr.prompt.md`        | PR verification checklist      |
| `add-db-column.prompt.md`    | Database schema change guide   |
| `debug-production.prompt.md` | Production debugging workflow  |
| `fix-test-failure.prompt.md` | Test failure analysis          |

## Notes

- Keep prompts **short and action-oriented**.
- Link to policy (`AGENTS.md`) instead of re-stating it.
