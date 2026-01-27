# Autonomous Engineering Operating System (AEOS)

> **Version:** 1.0.0  
> **Last Updated:** January 26, 2026  
> **Purpose:** Exhaustive, coherent, reproducible operating system for autonomous software delivery

---

## What is AEOS?

AEOS is a **complete operating system** for running autonomous software engineering agents. It combines:

- **Agent roles and identity** — PE, TL, SE with distinct GitHub accounts
- **Documentation architecture** — AGENTS.md, role files, instruction files
- **GitHub automation** — Workflows, labels, project board, PR templates
- **CI/CD** — Test pipelines, verification gates, deployment
- **Observability** — Sentry, Railway logs, health checks
- **Local tooling** — VS Code extensions, MCP servers, tasks
- **Policies and decisions** — Patterns, anti-patterns, escalation rules
- **Memory system** — MCP Memory + state file backups

**Goal:** The entire workflow can be recreated and run with minimal human intervention.

---

## AEOS Components

```
docs/aeos/
├── README.md                 ← You are here (index)
├── BOOT_PROCEDURE.md         ← Cold start from zero
├── RUNTIME_LOOP.md           ← Day-to-day agent execution
├── TOOLCHAIN.md              ← Integrations and dependencies
├── IDENTITY_SYSTEM.md        ← GitHub accounts and auth
├── MEMORY_SYSTEM.md          ← MCP Memory + state files
├── PATTERNS.md               ← Lessons learned (link to reference)
└── TEST_REPORTS/             ← AEOS test cycle reports
    └── 2026-01-26-boot-test.md
```

---

## Quick Reference

### Boot AEOS (from zero)

```powershell
# 1. Clone repo
git clone https://github.com/sirjamesoffordii/CMC-Go.git
cd CMC-Go

# 2. Install dependencies
pnpm install

# 3. Verify toolchain
pnpm check && pnpm test

# 4. Start database (Docker)
docker-compose up -d

# 5. Set up database
pnpm db:setup

# 6. Authenticate as PE
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-Principle-Engineer-Agent"
gh auth status

# 7. Boot PE (spawns TL → SE cascade)
code chat -n -m "principal-engineer" "You are PE-1. Boot AEOS. Start."
```

### Runtime Loop

```
PE (episodic planning)
  ↓ spawns
TL (continuous coordination)
  ↓ delegates to
SE (continuous implementation)
  ↓ opens
PRs → CI → Review → Merge → Loop
```

### Key Files

| File                                          | Purpose                        |
| --------------------------------------------- | ------------------------------ |
| `AGENTS.md`                                   | Canonical operating manual     |
| `.github/copilot-instructions.md`             | Repo-wide invariants           |
| `.github/agents/*.agent.md`                   | Role-specific behavior         |
| `.github/instructions/*.instructions.md`      | Path-scoped coding conventions |
| `docs/project/CMC_GO_PROJECT_OVERVIEW.md`     | Project brief (61% complete)   |
| `.github/agents/reference/CMC_GO_PATTERNS.md` | Accumulated knowledge          |

---

## AEOS Categories (4)

| Category                  | Purpose                   | Location                                           |
| ------------------------- | ------------------------- | -------------------------------------------------- |
| **Accumulated Knowledge** | Patterns/lessons learned  | MCP Memory `Pattern` entities + CMC_GO_PATTERNS.md |
| **Agent States**          | Heartbeats + current work | MCP Memory `Agent` observations + state files      |
| **AEOS**                  | Autonomous system docs    | This directory (docs/aeos/) + AGENTS.md            |
| **Project Brief**         | App overview + progress   | docs/project/CMC_GO_PROJECT_OVERVIEW.md            |

---

## Test Cycles

AEOS is continuously tested and hardened through three test types:

1. **Boot Test** — From-zero simulation (new agent, no tribal knowledge)
2. **Runtime Test** — Day-to-day loop (Issue → PR → Merge)
3. **Toolchain Test** — Integrations (CI, Codecov, Sentry, MCP)

Each test cycle produces:

- **Test Report** — What was tried, what failed, what changed
- **Repo Improvements** — Direct fixes to docs/scripts
- **Pattern Updates** — New lessons in CMC_GO_PATTERNS.md

---

## Links

- **Project Board:** https://github.com/users/sirjamesoffordii/projects/4
- **Repository:** https://github.com/sirjamesoffordii/CMC-Go
- **Deployed App:** https://cmc-go.up.railway.app
