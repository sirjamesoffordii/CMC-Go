# Scripts Directory

This directory contains scripts for database management, agent automation, data validation, and import/export operations for the CMC Go project.

---

## Quick Reference

| Script                       | Category   | Purpose                                                           |
| ---------------------------- | ---------- | ----------------------------------------------------------------- |
| `aeos-spawn.ps1`             | Agent      | **Primary** — Spawn AEOS agents (PE/TL/SE) with auto-activation   |
| `aeos-status.ps1`            | Agent      | Full AEOS status (heartbeat, assignment, worktrees, PRs)          |
| `seed-database.mjs`          | Database   | Comprehensive seeding (districts, campuses, people, needs, notes) |
| `reset-db.mjs`               | Database   | Drop all tables and reseed (with production safeguards)           |
| `reset-local-db.mjs`         | Database   | Safe local-only database reset with multiple safety checks        |
| `db-push-yes.mjs`            | Database   | Non-interactive drizzle-kit push wrapper                          |
| `run-migrations.mjs`         | Database   | Execute SQL migration files in order                              |
| `init-mysql-db.mjs`          | Database   | Initialize MySQL database connection                              |
| `seed-baseline.mjs`          | Database   | Seed only required baseline data (idempotent)                     |
| `seed-chi-alpha.mjs`         | Database   | Seed Chi Alpha regions and districts                              |
| `seed-regions-districts.mjs` | Database   | Seed regions and districts with colors                            |
| `seed-mysql-dev.mjs`         | Database   | Seed MySQL dev environment                                        |
| `reseed-districts.mjs`       | Database   | Re-seed districts matching SVG map IDs                            |
| `verify-database.mjs`        | Validation | Verify database schema matches expected structure                 |
| `verify-write.mjs`           | Validation | Test create/update operations persist correctly                   |
| `audit-migrations.mjs`       | Validation | Audit migration files against current schema                      |
| `check-schema.mjs`           | Validation | Check critical tables and columns exist                           |
| `check-map-data.mjs`         | Validation | Verify map data (districts, people, campuses)                     |
| `validate-agents.mjs`        | Validation | Validate agent and prompt YAML frontmatter                        |
| `import-from-export.mjs`     | Import     | Import data from exported JSON files                              |
| `ingest-excel.mjs`           | Import     | Ingest Excel seed data with sanitization                          |
| `agent-login-gh.ps1`         | Agent      | Interactive GitHub login for agent accounts                       |
| `agent-quick.ps1`            | Agent      | Quick agent operations (worktree, PR, issue comment)              |
| `create-agent-issues.ps1`    | Agent      | Create GitHub issues (URL, CLI, or REST API)                      |
| `clear-github-token.ps1`     | Agent      | Remove stored GitHub token                                        |
| `gh-as.ps1`                  | Agent      | Run `gh` commands as a specific agent account                     |
| `git-grep.ps1`               | Agent      | Fast search over git-tracked files (avoids recursion hangs)       |
| `git-credential-gh.ps1`      | Agent      | Git credential helper for multi-identity                          |
| `set-gh-secret.ps1`          | Agent      | Set GitHub repository secrets                                     |
| `setup-agent-identities.ps1` | Agent      | Configure git identities for agent worktrees                      |
| `post-merge-evidence.ps1`    | Agent      | Post merge evidence to GitHub issues                              |
| `populate-db.sql`            | Data       | SQL script to populate database (legacy)                          |
| `seed-data.sql`              | Data       | Simple SQL seed script (legacy)                                   |
| `temp-seed.sql`              | Data       | Temporary seed data SQL                                           |
| `seed-campuses.json`         | Data       | Campus seed data                                                  |
| `seed-districts.json`        | Data       | District seed data                                                |
| `seed-needs.json`            | Data       | Needs seed data                                                   |
| `seed-notes.json`            | Data       | Notes seed data                                                   |
| `seed-people.json`           | Data       | People seed data                                                  |

---

## Categories

### Database Scripts

Scripts for database initialization, seeding, migrations, and resets.

#### `seed-database.mjs`

Comprehensive database seeding script. Seeds districts, campuses, people, needs, notes, assignments, and settings.

```bash
pnpm db:seed
# or
node scripts/seed-database.mjs
```

#### `reset-db.mjs`

Drops all tables and reseeds the database. Includes production safeguards (hard fails if `NODE_ENV=production`).

```bash
pnpm db:reset
```

#### `reset-local-db.mjs`

**Safe** local-only database reset. Multiple safety checks:

- Only works with localhost/127.0.0.1/docker
- Hard fails if host is Railway/internal
- Requires explicit confirmation

```bash
pnpm db:reset:local
```

#### `db-push-yes.mjs`

Non-interactive wrapper for `drizzle-kit push`. Automatically confirms prompts to avoid interactive blocking.

```bash
pnpm db:push:yes
```

#### `run-migrations.mjs`

Executes SQL migration files from `drizzle/migrations/` in sorted order.

```bash
node scripts/run-migrations.mjs
```

#### `init-mysql-db.mjs`

Verifies MySQL database connection and reports schema management status.

```bash
node scripts/init-mysql-db.mjs
```

#### `seed-baseline.mjs`

Seeds only the **required** baseline data for the app to boot (idempotent - safe to run multiple times).

```bash
pnpm db:seed:baseline
```

#### `seed-chi-alpha.mjs`

Seeds Chi Alpha organization regions and districts with their colors from the SVG map.

```bash
node scripts/seed-chi-alpha.mjs
```

#### `seed-regions-districts.mjs`

Seeds regions and districts data with colors, mapping to SVG path IDs.

```bash
node scripts/seed-regions-districts.mjs
```

#### `seed-mysql-dev.mjs`

Seeds MySQL development environment with full sample data.

```bash
node scripts/seed-mysql-dev.mjs
```

#### `reseed-districts.mjs`

Re-seeds districts to match the actual SVG map `inkscape:label` values.

```bash
node scripts/reseed-districts.mjs
```

---

### Validation Scripts

Scripts for verifying database schema, data integrity, and agent documentation.

#### `verify-database.mjs`

Verifies the database schema matches expected table structures.

```bash
node scripts/verify-database.mjs
```

#### `verify-write.mjs`

Tests that create/update operations (createCampus, createPerson, updatePerson) persist correctly.

```bash
node scripts/verify-write.mjs
```

#### `audit-migrations.mjs`

Audits migration files against the current database schema. Reports tables/columns in DB not represented in migrations.

```bash
pnpm db:audit
```

#### `check-schema.mjs`

Checks that critical tables and columns exist in the database (matches `db-health.ts`).

```bash
node scripts/check-schema.mjs
```

#### `check-map-data.mjs`

Verifies map data integrity - districts, people, and campuses counts.

```bash
node scripts/check-map-data.mjs
```

#### `validate-agents.mjs`

Validates agent and prompt files in `.github/agents/` and `.github/prompts/`. Checks for required YAML frontmatter fields and valid references.

```bash
pnpm validate:agents
# or
node scripts/validate-agents.mjs
```

---

### Agent & GitHub Scripts

PowerShell scripts for GitHub authentication, agent identity management, and automated agent spawning.

#### `agent-login-gh.ps1`

Interactive GitHub login for agent accounts (`tech-lead-agent` or `software-engineer-agent`).

```powershell
.\scripts\agent-login-gh.ps1 -Account tech-lead-agent
.\scripts\agent-login-gh.ps1 -Account software-engineer-agent
```

#### `gh-as.ps1`

Run `gh` CLI commands as a specific agent account.

```powershell
.\scripts\gh-as.ps1 -Account tech-lead-agent issue list
.\scripts\gh-as.ps1 -Account software-engineer-agent pr view 42
```

#### `git-grep.ps1`

Fast search over **git-tracked** files (avoids `Get-ChildItem -Recurse` issues under `.worktrees/` / `.pnpm`).

```powershell
./scripts/git-grep.ps1 -Pattern "heartbeat" -CaseInsensitive
./scripts/git-grep.ps1 -Pattern "DistrictSlug" -Path "drizzle/"
```

#### `git-credential-gh.ps1`

Git credential helper that routes authentication through agent-specific `gh` config directories.

```powershell
# Typically configured in git config, not called directly
```

#### `setup-agent-identities.ps1`

Configures git identities and credential helpers for agent worktrees (`wt-agent-tl`, `wt-agent-swe`).

```powershell
.\scripts\setup-agent-identities.ps1
```

#### `create-agent-issues.ps1`

Creates GitHub issues in batch. Supports multiple modes:

- `url` - Print prefilled GitHub "new issue" URLs
- `gh` - Create issues using GitHub CLI
- `rest` - Create issues using GitHub REST API
- `auto` - Choose best available method

```powershell
.\scripts\create-agent-issues.ps1 -Mode gh
.\scripts\create-agent-issues.ps1 -Mode url -Open  # Opens in browser
```

#### `set-gh-secret.ps1`

Set GitHub repository secrets.

```powershell
.\scripts\set-gh-secret.ps1 -SecretName CODECOV_TOKEN
```

#### `clear-github-token.ps1`

Removes the stored GitHub token from local DPAPI storage.

```powershell
.\scripts\clear-github-token.ps1
```

#### Cloud-agent scripts

Cloud agents are disabled (no MCP Memory = drift). Cloud-agent scripts were removed.

#### `aeos-spawn.ps1` (PRIMARY)

**The primary script for spawning AEOS agents.** Spawns agents in isolated VS Code instances with auto-activation.

```powershell
# Spawn a single agent
.\scripts\aeos-spawn.ps1 -Agent PE    # Principal Engineer
.\scripts\aeos-spawn.ps1 -Agent TL    # Tech Lead
.\scripts\aeos-spawn.ps1 -Agent SE    # Software Engineer (in worktree)

# Spawn all 3 agents
.\scripts\aeos-spawn.ps1 -All
```

**Features:**

- Closes existing VS Code windows for the agent before spawning (ensures fresh start)
- Writes auto-activate.json config for the AEOS Activator extension
- Uses isolated user-data-dirs for per-agent Copilot rate limits
- SE is automatically spawned in the worktree at `C:\Dev\CMC-Go-Worktrees\wt-se`
- **Quota exhaustion detection:** Prevents rapid respawn loops (3+ spawns in 10 min)

#### `aeos-status.ps1`

Full AEOS system status including heartbeat, assignment, worktrees, PRs, and rate limits.

```powershell
.\scripts\aeos-status.ps1
```

---

#### `agent-quick.ps1`

Quick agent operations for common tasks (worktree setup, PR creation, issue comments).

```powershell
# Create worktree
.\scripts\agent-quick.ps1 -Mode worktree -WorktreePath "C:\path" -Branch "feature/x"

# Create PR
.\scripts\agent-quick.ps1 -Mode pr -Title "Feature X" -BodyFile "pr-body.md"

# Comment on issue
.\scripts\agent-quick.ps1 -Mode issue-comment -Issue 42 -Body "Status update..."
```

#### `post-merge-evidence.ps1`

Posts merge evidence comments to GitHub issues after PR merges.

```powershell
.\scripts\post-merge-evidence.ps1
```

---

### Import/Export Scripts

Scripts for importing and exporting data.

#### `import-from-export.mjs`

Imports data from exported JSON files into the database.

```bash
node scripts/import-from-export.mjs
```

#### `ingest-excel.mjs`

Ingests Excel seed data into the database. Follows structure rules:

- "People (Unique)" is source of truth
- "Assignments" defines roles
- Uses "Person ID" as primary key
- Includes sanitization for security

```bash
node scripts/ingest-excel.mjs <path-to-excel-file>
```

---

### Data Files

JSON and SQL files containing seed data.

| File                  | Purpose                                     |
| --------------------- | ------------------------------------------- |
| `seed-campuses.json`  | Campus data (name, district)                |
| `seed-districts.json` | District data (id, name, region, svgPathId) |
| `seed-needs.json`     | Staffing needs data                         |
| `seed-notes.json`     | Sample notes data                           |
| `seed-people.json`    | People data (name, role, contact info)      |
| `populate-db.sql`     | Legacy SQL population script                |
| `seed-data.sql`       | Simple SQL seed script                      |
| `temp-seed.sql`       | Temporary seed data                         |

---

### Utility Scripts

#### `utils/check-demo-db.mjs`

Utility to detect if `DATABASE_URL` points to Railway demo database. Used by destructive scripts to prevent accidental execution on production.

```javascript
import { checkNotDemoDatabase } from "./utils/check-demo-db.mjs";
checkNotDemoDatabase(connectionString, "my-script");
```

---

### Archived Scripts

Located in `_archive/` - deprecated scripts kept for reference.

| Script                          | Purpose                                           |
| ------------------------------- | ------------------------------------------------- |
| `reset-database.mjs`            | Old database reset (superseded by `reset-db.mjs`) |
| `add-missing-tables.mjs`        | One-time table creation                           |
| `seed-db.mjs`                   | Old seeding script                                |
| `apply-0004.mjs`                | One-time migration application                    |
| `remove-students.mjs`           | One-time student removal                          |
| `restore-students-as-staff.mjs` | One-time data migration                           |
| `test-query.mjs`                | Query testing utility                             |

---

## Common Workflows

### Fresh Development Setup

```bash
# 1. Start Docker MySQL
docker-compose up -d

# 2. Push schema
pnpm db:push:yes

# 3. Seed database
pnpm db:seed
```

### Reset Local Database

```bash
pnpm db:reset:local
```

### Verify Database Health

```bash
node scripts/check-schema.mjs
node scripts/verify-database.mjs
```

### Validate Agent Documentation

```bash
pnpm validate:agents
```

### Spawn Agent

```powershell
# Spawn any agent (PE, TL, or SE)
.\scripts\aeos-spawn.ps1 -Agent SE

# Spawn all agents
.\scripts\aeos-spawn.ps1 -All
```

---

## Environment Variables

Most scripts require:

- `DATABASE_URL` - MySQL connection string
- `NODE_ENV` / `APP_ENV` - Environment (production safeguards check these)

Agent scripts may require:

- `GITHUB_TOKEN` - For REST API operations
- `GH_CONFIG_DIR` - For multi-identity `gh` operations
