# AEOS Boot Procedure

> **Purpose:** Cold start AEOS from zero — as if you're a new agent with no tribal knowledge.

---

## Prerequisites

### Human Setup (one-time)

These require a human with the `sirjamesoffordii` account:

1. **GitHub accounts created:**
   - `Principle-Engineer-Agent` (PE)
   - `Alpha-Tech-Lead` (TL)
   - `Software-Engineer-Agent` (SE)

2. **Accounts added as collaborators** to `sirjamesoffordii/CMC-Go`

3. **GH CLI configs created:**

   ```
   C:/Users/sirja/.gh-principal-engineer-agent/   ← PE (lowercase dir, account is Principle-Engineer-Agent)
   C:/Users/sirja/.gh-alpha-tech-lead/            ← TL
   C:/Users/sirja/.gh-software-engineer-agent/    ← SE
   ```

   Each contains `hosts.yml` with auth token for that account.

   **Note:** PE directory is lowercase (`principal-engineer-agent`) but the GitHub account is `Principle-Engineer-Agent` (with the "Principle" spelling).

4. **Secrets configured:**
   - Repository secrets (Settings → Secrets → Actions):
     - `DATABASE_URL` — MySQL connection string
     - `COPILOT_ASSIGN_TOKEN_PRO` — For cloud agent handoff
   - Local `.env` file (never committed):
     - `DATABASE_URL`
     - `SENTRY_DSN`
     - `RAILWAY_TOKEN`

### System Requirements

| Tool       | Version | Check Command      |
| ---------- | ------- | ------------------ |
| Node.js    | 20+     | `node --version`   |
| pnpm       | 9+      | `pnpm --version`   |
| Git        | 2.40+   | `git --version`    |
| Docker     | 24+     | `docker --version` |
| GitHub CLI | 2.40+   | `gh --version`     |
| VS Code    | 1.95+   | `code --version`   |

---

## Boot Sequence

### Phase 1: Environment Setup

```powershell
# 1. Clone (if needed)
git clone https://github.com/sirjamesoffordii/CMC-Go.git
cd "CMC Go"

# 2. Sync to staging
git checkout staging
git fetch origin
git pull origin staging

# 3. Handle pending work (if any)
# Check for unpushed commits or uncommitted changes
git status -sb
# If ahead of origin → push or stash
# If dirty working tree → commit AEOS changes or stash

# 4. Install dependencies
pnpm install

# 4. Verify basic toolchain
pnpm check    # TypeScript
pnpm test     # Unit tests
pnpm lint     # ESLint
```

### Phase 2: Database Setup

```powershell
# 1. Start MySQL container
docker-compose up -d

# 2. Verify container running
docker ps | Select-String mysql

# 3. Initialize database (one of):
pnpm db:setup     # Full setup (migrations + seed)
# OR
pnpm db:push:yes  # Schema only (no seed)
pnpm db:seed      # Seed data

# 4. Verify database
pnpm run verify:database
```

### Phase 3: Agent Identity

```powershell
# Authenticate as your role (PE example)
# Note: Directory is lowercase, account is Principle-Engineer-Agent
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-principal-engineer-agent"

# Verify
gh auth status
# Should show: Logged in to github.com as Principle-Engineer-Agent

# Verify repo access
gh repo view sirjamesoffordii/CMC-Go --json name
```

### Phase 4: MCP Memory Check

```powershell
# In VS Code, run MCP Memory read to load context
# Use the mcp_memory_read_graph tool

# Expected entities:
# - CMC-Go-Autonomous-System (Project)
# - PE-1, TL-1, SE-1 (Agent)
# - AEOS, ProjectBrief, etc. (SystemCategory)
# - Patterns (Pattern)
```

### Phase 5: Boot Agent Hierarchy

**Spawn Hierarchy (strict):**

- PE spawns TL only
- TL spawns SE only
- PE does NOT spawn SE directly

**Spawn Methods:**

| Method             | Blocking? | Context Preserved? | When to Use                                      |
| ------------------ | --------- | ------------------ | ------------------------------------------------ |
| `runSubagent` tool | Yes       | Yes (full)         | **Primary method** — PE→TL, TL→SE                |
| `code chat -r -m`  | No        | Yes (same window)  | Manual spawn in same VS Code window              |
| `code chat -n`     | No        | No (new window)    | **Not recommended** — loses agent mode & context |

**Recommended: Use `runSubagent` tool** — preserves context, agent mode, and workspace.

#### VS Code Chat CLI Reference

```powershell
# Full syntax
code chat [options] [prompt]

# Options:
#   -m --mode <mode>      Agent mode: 'ask', 'edit', 'agent', or custom mode name
#   -a --add-file <path>  Add file as context (can use multiple times)
#   -r --reuse-window     Use last active VS Code window (creates new chat tab)
#   -n --new-window       Open new VS Code window (loses context!)
#   --maximize            Maximize chat panel

# Examples:
code chat -r -m "Tech Lead" -a AGENTS.md "You are TL-1. Start."          # New TL chat
code chat -r -m "Software Engineer" -a AGENTS.md "You are SE-1. Start."  # New SE chat
```

**IMPORTANT:** The `-r` flag creates a new chat TAB in the same window, it does NOT replace the current chat. This is the correct behavior for spawning additional agents.

#### If you ARE the PE:

```powershell
# 1. Check board state
gh project item-list 4 --owner sirjamesoffordii --limit 10 --format json | ConvertFrom-Json | Select-Object -ExpandProperty items | Format-Table number, title, status

# 2. Check if TL is running (MCP Memory)
# Use mcp_memory_open_nodes for TL-1
# Look for heartbeat observation with timestamp
# TL is MISSING if:
#   - No heartbeat observation exists, OR
#   - Last heartbeat > 6 minutes ago
# TL is ALIVE if heartbeat < 6 minutes ago

# 3. If TL missing → spawn TL using runSubagent tool
# Prompt template:
```

**TL Spawn Prompt (for PE to use with runSubagent):**

```
You are TL-1(1). PE has spawned you for execution coordination.

Your responsibilities:
1. Verify auth: $env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-alpha-tech-lead"
2. Post heartbeat to MCP Memory
3. Poll board for Todo items
4. Spawn SE-1 (using runSubagent) to work highest priority item
5. Review PRs, unblock issues, keep work flowing
6. Report back: what you delegated, board state, any blockers

Board location: Project 4 (sirjamesoffordii)
Start now. Keep coordinating until board is empty or you're blocked.
```

#### If you ARE the TL:

```powershell
# 1. Authenticate
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-alpha-tech-lead"
gh auth status

# 2. Check board for work
gh project item-list 4 --owner sirjamesoffordii --limit 10 --format json

# 3. Check if SE is running (MCP Memory)
# Query for SE-1 heartbeat (same criteria as PE checking TL)

# 4. If SE missing → spawn SE using runSubagent tool
# Prompt template below
```

**SE Spawn Prompt (for TL to use with runSubagent):**

```
You are SE-1(1). TL has spawned you for implementation.

Your responsibilities:
1. Verify auth: $env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-software-engineer-agent"
2. Post heartbeat to MCP Memory
3. Check board for highest priority Todo item
4. Claim it: assign yourself, set status to In Progress
5. Create worktree: wt-impl-<issue#>-<slug>
6. Implement smallest working solution
7. Run checks: pnpm check && pnpm test
8. Open PR with evidence
9. Report back: Issue #, PR #, what you did

Board location: Project 4 (sirjamesoffordii)
Start now. Keep implementing until you complete the task or hit a blocker.
```

#### If you ARE the SE:

```powershell
# 1. Authenticate
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-software-engineer-agent"
gh auth status

# 2. Check board for Todo items
gh project item-list 4 --owner sirjamesoffordii --limit 20 --format json | ConvertFrom-Json | Select-Object -ExpandProperty items | Where-Object { $_.status -eq "Todo" }

# 3. Claim highest priority item
# Set status → In Progress
# Start implementation
```

---

## Chat Tab Naming Convention

**All agents must rename their VS Code chat tab** to show identity:

| Agent | Tab Name Format | Example   |
| ----- | --------------- | --------- |
| PE    | `PE-1(gen)`     | `PE-1(1)` |
| TL    | `TL-1(gen)`     | `TL-1(2)` |
| SE    | `SE-1(gen)`     | `SE-1(3)` |

**How:** Right-click chat tab → Rename → Enter ID(gen)

This makes it easy for humans to see which agents are running.

---

## Verification Checklist

Run after boot to confirm AEOS is operational:

| Check            | Command                                           | Expected                      |
| ---------------- | ------------------------------------------------- | ----------------------------- |
| Git clean        | `git status -sb`                                  | `## staging...origin/staging` |
| pnpm works       | `pnpm check`                                      | No errors                     |
| Tests pass       | `pnpm test`                                       | All green                     |
| DB connected     | `pnpm run verify:database`                        | "Database OK"                 |
| GH auth          | `gh auth status`                                  | Shows correct account         |
| MCP Memory       | `mcp_memory_read_graph`                           | Returns entities              |
| Board accessible | `gh project item-list 4 --owner sirjamesoffordii` | Returns items                 |

---

## Troubleshooting

### "gh: command not found"

```powershell
winget install --id GitHub.cli
```

### "Permission denied" on gh commands

```powershell
# Re-authenticate
gh auth login -w
```

### "Database connection refused"

```powershell
# Start Docker container
docker-compose up -d

# Check if running
docker ps

# Check logs
docker logs cmc-go-mysql
```

### "MCP Memory unavailable"

Fall back to state files at `.github/agents/state/*.md`. Read your state file and continue from there.

### "Board shows no items"

Either board is empty (run Cold Start in AGENTS.md) or wrong project number. Project 4 = CMC Go v1.0 Roadmap.

---

## Next Steps After Boot

1. **PE:** Run planning epoch (see AGENTS.md)
2. **TL:** Poll board, delegate work (see RUNTIME_LOOP.md)
3. **SE:** Claim Todo item, implement, open PR
