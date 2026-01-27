# AEOS Toolchain

> **Purpose:** All integrations, dependencies, and external services that AEOS relies on.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOCAL DEVELOPMENT                                  │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   VS Code       │  │   Terminal      │  │   Docker                    │  │
│  │  + Copilot      │  │  + PowerShell   │  │  + MySQL 8.0                │  │
│  │  + Extensions   │  │  + Git          │  │  + docker-compose.yml       │  │
│  │  + MCP Servers  │  │  + GitHub CLI   │  │                             │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────┬───────────────┘  │
│           │                    │                         │                   │
└───────────┼────────────────────┼─────────────────────────┼───────────────────┘
            │                    │                         │
            ▼                    ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GITHUB                                          │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   Repository    │  │   Actions (CI)  │  │   Projects v2               │  │
│  │  + Issues       │  │  + Tests        │  │  + CMC Go Board             │  │
│  │  + PRs          │  │  + Coverage     │  │  + Status tracking          │  │
│  │  + Labels       │  │  + Validation   │  │                             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRODUCTION                                        │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   Railway       │  │   Sentry        │  │   Codecov                   │  │
│  │  + App hosting  │  │  + Error track  │  │  + Coverage reports         │  │
│  │  + MySQL        │  │  + Alerts       │  │                             │  │
│  │  + Logs         │  │                 │  │                             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## VS Code Configuration

### Required Extensions

File: `.vscode/extensions.json`

| Extension                               | Purpose              |
| --------------------------------------- | -------------------- |
| `esbenp.prettier-vscode`                | Code formatting      |
| `dbaeumer.vscode-eslint`                | Linting              |
| `usernamehw.errorlens`                  | Inline error display |
| `mtxr.sqltools`                         | Database queries     |
| `mtxr.sqltools-driver-mysql`            | MySQL driver         |
| `streetsidesoftware.code-spell-checker` | Spell checking       |
| `github.vscode-pull-request-github`     | PR integration       |
| `github.copilot`                        | AI assistance        |
| `github.copilot-chat`                   | AI chat interface    |
| `bacebu4.sentry-issues`                 | Sentry integration   |

### MCP Servers

File: `.vscode/mcp.json`

| Server    | Purpose                  | Auth Required           |
| --------- | ------------------------ | ----------------------- |
| `railway` | Deployments, logs        | `RAILWAY_TOKEN` env var |
| `memory`  | Persistent agent context | None                    |

### VS Code Tasks

File: `.vscode/tasks.json`

| Task                      | Command              | Purpose             |
| ------------------------- | -------------------- | ------------------- |
| `Agent: Health check`     | Comprehensive checks | Verify all systems  |
| `Agent: Recover terminal` | Reset pager settings | Fix terminal hangs  |
| `Test: Unit tests`        | `pnpm test`          | Run Vitest          |
| `Test: E2E smoke`         | `pnpm e2e`           | Run Playwright      |
| `DB: Full setup`          | `pnpm db:setup`      | Initialize database |
| `Git: Status`             | `git status -sb`     | Quick status        |
| `GH: Merge PR (squash)`   | `gh pr merge`        | Merge with squash   |

---

## GitHub CLI Authentication

### Identity Separation

Each agent has a dedicated GitHub account with its own auth config:

| Role  | Account                    | Config Directory                  |
| ----- | -------------------------- | --------------------------------- |
| PE    | `Principle-Engineer-Agent` | `~/.gh-Principle-Engineer-Agent/` |
| TL    | `Alpha-Tech-Lead`          | `~/.gh-alpha-tech-lead/`          |
| SE    | `Software-Engineer-Agent`  | `~/.gh-software-engineer-agent/`  |
| Human | `sirjamesoffordii`         | Default (`~/.config/gh/`)         |

### Switch Identity

```powershell
# PE
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-Principle-Engineer-Agent"

# TL
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-alpha-tech-lead"

# SE
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-software-engineer-agent"

# Verify
gh auth status
```

### Auth File Structure

Each config directory contains:

```
.gh-<account>/
└── hosts.yml
    github.com:
        user: <account>
        oauth_token: <token>
        git_protocol: https
```

---

## GitHub Workflows (CI/CD)

Location: `.github/workflows/`

| Workflow                        | Trigger      | Purpose                     |
| ------------------------------- | ------------ | --------------------------- |
| `test-and-coverage.yml`         | Push, PR     | Run tests, upload coverage  |
| `verification-gate.yml`         | PR labels    | Enforce verification policy |
| `copilot-auto-handoff.yml`      | Issue label  | Assign to Copilot agent     |
| `copilot-completion-notify.yml` | Agent PR     | Notify TL of completion     |
| `validate-agents.yml`           | PR           | Validate agent file syntax  |
| `auto-project-sync.yml`         | Issue events | Sync Issues to Project      |
| `codeql.yml`                    | Push         | Security analysis           |
| `stale.yml`                     | Schedule     | Close stale Issues/PRs      |

### Required Secrets

| Secret                     | Used By                    | Purpose              |
| -------------------------- | -------------------------- | -------------------- |
| `DATABASE_URL`             | `test-and-coverage.yml`    | MySQL connection     |
| `COPILOT_ASSIGN_TOKEN_PRO` | `copilot-auto-handoff.yml` | Cloud agent spawning |
| `CODECOV_TOKEN`            | `test-and-coverage.yml`    | Coverage upload      |

---

## Database (MySQL)

### Local Development

File: `docker-compose.yml`

```yaml
services:
  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: cmc_go_dev
```

### Commands

```powershell
# Start container
docker-compose up -d

# Stop container
docker-compose down

# View logs
docker logs cmc-go-mysql

# Connect directly
docker exec -it cmc-go-mysql mysql -uroot -proot cmc_go_dev
```

### Drizzle ORM

| Command            | Purpose                  |
| ------------------ | ------------------------ |
| `pnpm db:push:yes` | Push schema changes      |
| `pnpm db:seed`     | Seed test data           |
| `pnpm db:reset`    | Reset database           |
| `pnpm db:setup`    | Full setup (push + seed) |

### Schema Location

- Authoritative: `drizzle/schema.ts`
- Migrations: `drizzle/migrations/`
- Relations: `drizzle/relations.ts`

---

## Railway (Production)

### CLI Commands

```powershell
# Check status
railway status

# View logs (recent)
railway logs --limit 100

# View logs (live)
railway logs --follow

# Search for errors
railway logs --limit 200 | Select-String -Pattern 'error|Error|ERROR'

# Deploy
railway up
```

### MCP Integration

The Railway MCP server provides:

- `mcp_railway_get-logs` — Fetch deployment logs
- `mcp_railway_deploy` — Trigger deployment
- `mcp_railway_list-services` — List services

### Environment Variables (Railway)

| Variable         | Purpose          |
| ---------------- | ---------------- |
| `DATABASE_URL`   | MySQL connection |
| `NODE_ENV`       | `production`     |
| `SENTRY_DSN`     | Error tracking   |
| `SESSION_SECRET` | Auth sessions    |

---

## Sentry (Observability)

### Integration

- Server: `server/_core/index.ts` initializes Sentry
- Client: `client/src/main.tsx` initializes Sentry

### VS Code Extension

`bacebu4.sentry-issues` provides:

- Issue browser
- Error details
- Source context

### Common Queries

```
# All errors in last 24h
is:unresolved firstSeen:-24h

# Specific error
message:"TRPC_ERROR"
```

---

## Codecov (Coverage)

### Integration

- Workflow: `test-and-coverage.yml` uploads coverage
- Config: `.codecov.yml` (if present)

### Viewing

- PR comments show coverage diff
- Dashboard: https://app.codecov.io/gh/sirjamesoffordii/CMC-Go

---

## MCP Memory Server

### Purpose

Persistent knowledge graph for agent context across sessions.

### Configuration

File: `.vscode/mcp.json`

```json
{
  "servers": {
    "memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

### Operations

| Tool                          | Purpose                  |
| ----------------------------- | ------------------------ |
| `mcp_memory_read_graph`       | Load all entities        |
| `mcp_memory_create_entities`  | Create new entities      |
| `mcp_memory_add_observations` | Add to existing entities |
| `mcp_memory_search_nodes`     | Search by query          |
| `mcp_memory_delete_entities`  | Remove entities          |

### Entity Types

| Type             | Purpose               | Example                  |
| ---------------- | --------------------- | ------------------------ |
| `Agent`          | Agent state           | `SE-1`                   |
| `Pattern`        | Reusable learnings    | `TRPCErrorHandling`      |
| `WorkflowChange` | Workflow improvements | `HeartbeatInterval-3min` |
| `SystemCategory` | Meta-categories       | `AEOS`, `ProjectBrief`   |

---

## Secrets Management

### DO NOT COMMIT

These files are gitignored:

- `.env`
- `.env.local`
- `.env.*.local`
- `*.pem`
- `*.key`

### Safe References

Secrets should be referenced by NAME only in docs:

- ✅ "Set `DATABASE_URL` in .env"
- ❌ Actual connection strings

### Human Input for Secrets

When an agent needs a secret:

1. Set Status → Blocked
2. Post: "Need `<SECRET_NAME>` set in .env"
3. Wait for human to provide
4. Continue

---

## Health Checks

### Agent: Health check (VS Code task)

Verifies:

- Terminal echo works
- Git status works
- GitHub CLI authenticated
- Node/pnpm versions
- Repo state (branch, clean/dirty)

### Manual Verification

```powershell
# Full stack check
pnpm check      # TypeScript
pnpm test       # Unit tests
pnpm lint       # ESLint
pnpm e2e        # E2E (if server running)

# Database check
pnpm run verify:database
```
