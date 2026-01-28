# Autonomous Engineering Operating System (AEOS)

> **Version:** 2.0.0
> **Last Updated:** January 28, 2026
> **Purpose:** Simple, reliable operating system for autonomous software delivery

---

## What is AEOS?

AEOS is a **lightweight operating system** for running autonomous software engineering agents. It combines:

- **Agent roles and identity** — PE, TL, SE with distinct GitHub accounts
- **Simple architecture** — AGENTS.md is the single source of truth
- **Heartbeat system** — Local file for agent liveness tracking
- **GitHub as work bus** — Project board for coordination
- **CI/CD** — Test pipelines, verification gates, deployment

**Goal:** Spawn agents → they read AGENTS.md + board → they work autonomously.

---

## Architecture

```
PE (continuous) — reviews repo/app, creates issues, monitors heartbeats
  ├── TL-1 (continuous) → spawns SE sessions, reviews PRs
  └── TL-2 (continuous) → spawns SE sessions, reviews PRs
        ├── SE-1 (session) → implements issues
        └── SE-2 (session) → implements issues
```

- All agents are standalone sessions (`code chat -r`)
- All agents self-register in heartbeat file
- Board is the command center

---

## AEOS Components

```
docs/aeos/
├── README.md                 ← You are here (human overview)
├── IDENTITY_SYSTEM.md        ← GitHub accounts and auth setup
└── TROUBLESHOOTING.md        ← Recovery procedures

Key agent files:
├── AGENTS.md                 ← Single source of truth for agents
├── .github/agents/*.agent.md ← Role-specific behavior
└── .github/agents/heartbeat.json ← Agent liveness (gitignored)
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
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-principal-engineer-agent"
gh auth status

# 7. Boot PE
code chat -r -m "Principal Engineer" -a AGENTS.md "You are PE-1. Start."
```

### Key Files

| File                                          | Purpose                     |
| --------------------------------------------- | --------------------------- |
| `AGENTS.md`                                   | Canonical agent manual      |
| `.github/agents/*.agent.md`                   | Role-specific behavior      |
| `.github/agents/heartbeat.json`               | Agent liveness (gitignored) |
| `.github/agents/reference/CMC_GO_PATTERNS.md` | Learned patterns            |

---

## Heartbeat System

**File:** `.github/agents/heartbeat.json` (local only, never committed)

- Every 3 min: Agents update their entry
- Stale >6 min: Senior agent respawns (PE respawns TL)
- Core agents: `["PE-1", "TL-1", "TL-2"]`
- Non-core (SE-\*): Ephemeral, delete if stale

---

## Links

- **Project Board:** https://github.com/users/sirjamesoffordii/projects/4
- **Repository:** https://github.com/sirjamesoffordii/CMC-Go
- **Deployed App:** https://cmc-go.up.railway.app
