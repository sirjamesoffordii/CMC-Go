# AEOS Toolchain

Purpose: integrations, dependencies, and external services AEOS relies on.

---

## Local Development (Windows)

- VS Code + extensions + tasks
- Terminal: PowerShell + Git + GitHub CLI
- Node.js + pnpm
- Docker Desktop + MySQL 8.0 (via docker-compose)
- MCP servers (Railway, Memory)

---

## VS Code

### Extensions

Source of truth: `.vscode/extensions.json`

- Formatting: `esbenp.prettier-vscode`
- Linting: `dbaeumer.vscode-eslint`
- Inline errors: `usernamehw.errorlens`
- DB tooling: `mtxr.sqltools`, `mtxr.sqltools-driver-mysql`
- Spelling: `streetsidesoftware.code-spell-checker`
- GitHub PRs: `github.vscode-pull-request-github`
- Copilot: `github.copilot`, `github.copilot-chat`
- Sentry issues: `bacebu4.sentry-issues`

### Tasks

Source of truth: `.vscode/tasks.json`

- `Agent: Health check`
- `Agent: Recover terminal`
- `Check: TypeScript` (`pnpm check`)
- `Test: Unit tests` (`pnpm test`)
- `Test: E2E smoke` (`pnpm e2e`)
- `DB: Full setup` / `DB: Push schema` / `DB: Seed database`
- `Git: Status`
- `GH: Merge PR (squash)`

---

## MCP Servers

Source of truth: `.vscode/mcp.json`

| Server    | Purpose                  | Auth                    |
| --------- | ------------------------ | ----------------------- |
| `railway` | deployments, logs        | `RAILWAY_TOKEN` env var |
| `memory`  | persistent agent context | none                    |

### Memory Server Config (example)

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

Common tools: `mcp_memory_read_graph`, `mcp_memory_add_observations`, `mcp_memory_search_nodes`.

---

## GitHub (CI/CD)

Workflows live in `.github/workflows/`:

- `test-and-coverage.yml` — tests + coverage
- `verification-gate.yml` — PR policy gates
- `validate-agents.yml` — validate agent docs/syntax
- `copilot-auto-handoff.yml` — **DEPRECATED** (cloud agents disabled)
- `copilot-completion-notify.yml` — notify TL on agent PRs
- `auto-project-sync.yml` — issues → project sync
- `codeql.yml` — security analysis
- `stale.yml` — stale cleanup

Required secrets:

| Secret                     | Used by                    | Purpose                         |
| -------------------------- | -------------------------- | ------------------------------- |
| `DATABASE_URL`             | `test-and-coverage.yml`    | MySQL connection                |
| `COPILOT_ASSIGN_TOKEN_PRO` | `copilot-auto-handoff.yml` | **DEPRECATED** (cloud disabled) |
| `CODECOV_TOKEN`            | `test-and-coverage.yml`    | coverage upload                 |

---

## Database (MySQL + Drizzle)

Local container: `docker-compose.yml` (MySQL 8.0).

```powershell
docker-compose up -d
docker-compose down
docker logs cmc-go-mysql
docker exec -it cmc-go-mysql mysql -uroot -proot cmc_go_dev
```

Drizzle commands:

- `pnpm db:push:yes` — push schema
- `pnpm db:seed` — seed data
- `pnpm db:reset` — reset DB
- `pnpm db:setup` — push + seed

Schema locations:

- `drizzle/schema.ts` (authoritative)
- `drizzle/migrations/`
- `drizzle/relations.ts`

---

## Railway (Production)

```powershell
railway status
railway logs --limit 100
railway logs --follow
railway logs --limit 200 | Select-String -Pattern 'error|Error|ERROR'
railway up
```

MCP capabilities (Railway): `mcp_railway_get-logs`, `mcp_railway_deploy`, `mcp_railway_list-services`.

Common env vars:

| Variable         | Purpose          |
| ---------------- | ---------------- |
| `DATABASE_URL`   | MySQL connection |
| `NODE_ENV`       | `production`     |
| `SENTRY_DSN`     | error tracking   |
| `SESSION_SECRET` | auth sessions    |

---

## Observability & Coverage

- Sentry init: `server/_core/index.ts` and `client/src/main.tsx`
- Codecov via CI: `test-and-coverage.yml` (dashboard: https://app.codecov.io/gh/sirjamesoffordii/CMC-Go)

---

## Secrets Management

Never commit secrets. These are gitignored: `.env`, `.env.local`, `.env.*.local`, `*.pem`, `*.key`.

Docs should reference secret names only (example: “Set `DATABASE_URL` in .env”).

If a secret is missing:

1. Set Status → Blocked
2. Ask for the secret name (not the value)
3. Continue after it’s provided out-of-band

---

## Health Checks

Preferred: VS Code task `Agent: Health check`.

Manual verification:

```powershell
pnpm check      # TypeScript
pnpm test       # Unit tests
pnpm lint       # ESLint
pnpm e2e        # E2E (if server running)

pnpm run verify:database
```
