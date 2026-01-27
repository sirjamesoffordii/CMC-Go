# CMC Go — Agent Operating Manual

**Single source of truth** for how agents operate. Detailed procedures live in `docs/aeos/`.

## Quick Start (30 seconds)

```powershell
# 1. Health check
# Run VS Code task: "Agent: Health check"

# 2. Authenticate
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-<your-account>"  # pe/tl/se
gh auth status

# 3. Check board
gh project item-list 4 --owner sirjamesoffordii --limit 10 --format json | ConvertFrom-Json | Select-Object -ExpandProperty items | Format-Table number, title, status

# 4. Find work
# - Status = "In Progress" assigned to you → continue it
# - Status = "Todo" → claim highest priority
# - Board empty → Cold Start (see docs/aeos/PROJECT_BOARD.md)
```

**Then execute your role. That's it.**

---

## Roles

| Role | Account                    | Model    | Responsibility                    |
| ---- | -------------------------- | -------- | --------------------------------- |
| PE   | `Principle-Engineer-Agent` | Opus 4.5 | Planning, coherence, arbitration  |
| TL   | `Alpha-Tech-Lead`          | Opus 4.5 | Coordination, delegation, merging |
| SE   | `Software-Engineer-Agent`  | GPT-5.2  | Implementation, verification      |

**Role files:** `.github/agents/{principal-engineer,tech-lead,software-engineer}.agent.md`

---

## Core Principles

1. **Board is truth** — Update status immediately, not at session end
2. **Small diffs** — Optimize for reviewability
3. **Evidence required** — Commands + results for every PR
4. **No secrets in chat** — Use terminal prompts, clear immediately
5. **Keep looping** — Take next safe step until Done
6. **Reflect** — Every PR gets 2-line reflection

---

## Spawning Agents

**ID Format:** `Role-#(Gen#)` — e.g., `TL-1(1)`, `SE-1(2)`, `PE-1(1)`

- **Role-#** = which instance (TL-1, TL-2, SE-1, SE-2)
- **Gen#** = generation (increments on respawn). If gen# changes, previous instance stopped.

```powershell
# Standard spawn prompt (MUST end with this line):
code chat -r -m "Tech Lead" -a AGENTS.md "You are TL-1(1). FULLY AUTONOMOUS - NO QUESTIONS. Loop forever. Start now."
code chat -r -m "Software Engineer" -a AGENTS.md "You are SE-1(1). FULLY AUTONOMOUS - NO QUESTIONS. Loop forever. Start now."
```

**Hierarchy:** PE → TL → SE (PE spawns TL only, TL spawns SE only)

**Details:** [docs/aeos/SPAWN_PROCEDURES.md](docs/aeos/SPAWN_PROCEDURES.md)

---

## Delegation Decision

| Score | Route To | Method                           |
| ----- | -------- | -------------------------------- |
| 0-1   | Yourself | Direct (but TL never edits code) |
| 2-6   | Local SE | See spawn commands above         |

**Scoring:** Risk (0-2) + Scope (0-2) + Ambiguity (0-2) = 0-6

**Note:** Cloud agents are disabled (no MCP Memory access = drift). Use local SE only.

**Details:** [docs/aeos/MODEL_SELECTION.md](docs/aeos/MODEL_SELECTION.md)

---

## Board Workflow

| Status      | Meaning             | Who Sets |
| ----------- | ------------------- | -------- |
| Todo        | Ready, not claimed  | TL       |
| In Progress | Actively working    | Assignee |
| Blocked     | Waiting on decision | Assignee |
| Verify      | Done, needs review  | Assignee |
| Done        | Merged              | TL       |

**Details:** [docs/aeos/PROJECT_BOARD.md](docs/aeos/PROJECT_BOARD.md)

---

## PR Requirements

```markdown
## Why

Link to Issue #X

## What Changed

- Bullet points

## How Verified

pnpm check # ✅
pnpm test # ✅

## Risk

Low/Med/High — reason

## End-of-Task Reflection

- **Workflow:** No changes / [file] — [change]
- **Patterns:** No changes / [file] — [change]
```

**Details:** [docs/aeos/PR_STANDARDS.md](docs/aeos/PR_STANDARDS.md)

---

## Heartbeat Protocol (Simple)

**MCP Memory only.** Every 3 minutes, each agent posts:

```
mcp_memory_add_observations: entityName: "<role>-<#>", contents: ["heartbeat: <ISO-8601> | <context> | <status>"]
```

- **Stale:** 6 min no heartbeat → supervisor respawns
- **First heartbeat:** Immediately on spawn (not 60 seconds later)

**Details:** [docs/aeos/MEMORY_SYSTEM.md](docs/aeos/MEMORY_SYSTEM.md)

---

## Worktrees & Branches

- `wt-main` — only place for `pnpm dev`
- `wt-impl-<issue#>-<slug>` — implementation
- `wt-verify-<pr#>-<slug>` — verification

**Branch format:** `agent/<role>/<issue#>-<slug>` (e.g., `agent/se-1/42-fix-bug`)
**Commit format:** `agent(<role>): <summary>` (e.g., `agent(se-1): Fix district filter`)

---

## Troubleshooting

| Problem        | Quick Fix                       |
| -------------- | ------------------------------- |
| Terminal stuck | Task: `Agent: Recover terminal` |
| Rebase stuck   | Task: `Git: Rebase abort`       |
| Dirty tree     | Task: `Git: Hard reset staging` |
| Auth issues    | Re-set `GH_CONFIG_DIR`          |

**Details:** [docs/aeos/TROUBLESHOOTING.md](docs/aeos/TROUBLESHOOTING.md)

---

## AEOS Documentation

Complete operating system docs:

| Doc                                                  | Purpose              |
| ---------------------------------------------------- | -------------------- |
| [BOOT_PROCEDURE.md](docs/aeos/BOOT_PROCEDURE.md)     | System startup       |
| [RUNTIME_LOOP.md](docs/aeos/RUNTIME_LOOP.md)         | Continuous execution |
| [IDENTITY_SYSTEM.md](docs/aeos/IDENTITY_SYSTEM.md)   | Auth & accounts      |
| [MEMORY_SYSTEM.md](docs/aeos/MEMORY_SYSTEM.md)       | MCP & state          |
| [SPAWN_PROCEDURES.md](docs/aeos/SPAWN_PROCEDURES.md) | Agent spawning       |
| [MODEL_SELECTION.md](docs/aeos/MODEL_SELECTION.md)   | Model costs          |
| [PROJECT_BOARD.md](docs/aeos/PROJECT_BOARD.md)       | Board workflow       |
| [PR_STANDARDS.md](docs/aeos/PR_STANDARDS.md)         | Evidence & PRs       |
| [TROUBLESHOOTING.md](docs/aeos/TROUBLESHOOTING.md)   | Escape hatches       |

---

## Instruction Surfaces

| Surface                                  | Purpose                | Edit When          |
| ---------------------------------------- | ---------------------- | ------------------ |
| `AGENTS.md`                              | Quick reference, links | Workflow changes   |
| `docs/aeos/`                             | Detailed procedures    | Deep dives         |
| `.github/agents/*.agent.md`              | Role overlays          | Role behavior      |
| `.github/instructions/*.instructions.md` | Code patterns          | Coding conventions |
| `.github/copilot-instructions.md`        | Repo invariants        | Architecture       |

**Anti-duplication:** Define each rule in exactly one place. Link from others.
