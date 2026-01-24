# `.github/agents/reference/` — Reference Docs

This folder contains **reference documentation** that agents can consult but that shouldn't appear in the VS Code agent picker.

## Files

| File                  | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| `CMC_GO_PATTERNS.md`  | Curated pitfalls/patterns (project learnings)  |
| `RAILWAY_COMMANDS.md` | Railway CLI commands for debugging deployments |
| `README.md`           | This file                                      |

## Why These Are Here

VS Code shows any `.md` file with YAML frontmatter as an agent in the picker. These are reference docs, not agents, so they live in this subfolder to keep the picker clean.

## Active Agent Files

The actual agent definitions are in the parent folder:

- `tech-lead.agent.md` — Tech Lead role
- `software-engineer.agent.md` — Software Engineer role
