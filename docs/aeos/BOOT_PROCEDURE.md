# AEOS Boot Procedure

> **Purpose:** Cold-start AEOS from zero with minimal steps.

This procedure keeps you unblocked and gets you to “board → claim → implement → PR”.

---

## Prerequisites

- Repo access to `sirjamesoffordii/CMC-Go`
- Tooling installed: Node 20+, pnpm 9+, Git, Docker, GitHub CLI
- DB connection available via `DATABASE_URL` (local `.env`, never committed)
- Role identity configured (GH CLI config + tokens): see `docs/aeos/IDENTITY_SYSTEM.md`

---

## Boot Sequence

### Phase 1: Environment Setup

```powershell
git clone https://github.com/sirjamesoffordii/CMC-Go.git
cd "CMC Go"

git checkout staging
git fetch origin
git pull origin staging

pnpm install
```

### Phase 2: Database Setup

```powershell
docker-compose up -d

# Choose one path:
pnpm db:setup     # migrations + seed
# OR
pnpm db:push:yes  # schema only
pnpm db:seed      # seed data

pnpm run verify:database
```

### Phase 3: Agent Identity

Auth details are centralized—do not duplicate them here.

- Follow `docs/aeos/IDENTITY_SYSTEM.md` to set your role’s `GH_CONFIG_DIR`
- Then verify:

```powershell
gh auth status
gh repo view sirjamesoffordii/CMC-Go --json name
```

### Phase 4: MCP Memory Check

In VS Code, run `mcp_memory_read_graph` and confirm you can see the project + agents.

Minimum expected entities:

- `CMC-Go-Autonomous-System` (Project)
- `PE-1`, `TL-1`, `SE-1` (Agent)

### Phase 5: Boot Agent Hierarchy

Spawn hierarchy (strict):

- PE spawns TL only
- TL spawns SE only
- PE does not spawn SE directly

Spawn examples (one each):

```powershell
# PE → TL (same VS Code window)
code chat -r -m "Tech Lead" -a AGENTS.md "You are TL-1. Start."

# TL → SE (same VS Code window)
code chat -r -m "Software Engineer" -a AGENTS.md "You are SE-1. Start."
```

Role-specific boot actions:

- **If you are PE:** Check board, ensure TL heartbeat is fresh, spawn TL if missing.
- **If you are TL:** Check board, ensure SE heartbeat is fresh, spawn SE if missing.
- **If you are SE:** Check board, claim highest-priority Todo, create worktree, implement.

Optional hygiene:

- Rename the chat tab to `PE-1(1)` / `TL-1(1)` / `SE-1(1)`.

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

## Troubleshooting (quick)

- GH CLI missing: `winget install --id GitHub.cli`
- GH auth broken: re-run the steps in `docs/aeos/IDENTITY_SYSTEM.md`
- DB issues: `docker-compose up -d`; then `pnpm run verify:database`
- MCP Memory unavailable: read `.github/agents/state/*.md` and proceed

### "Board shows no items"

Either board is empty (run Cold Start in AGENTS.md) or wrong project number. Project 4 = CMC Go v1.0 Roadmap.

---

## Next Steps After Boot

1. **PE:** Run planning epoch (see AGENTS.md)
2. **TL:** Poll board, delegate work (see RUNTIME_LOOP.md)
3. **SE:** Claim Todo item, implement, open PR
