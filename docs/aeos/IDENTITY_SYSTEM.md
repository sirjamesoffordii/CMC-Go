# AEOS Identity System

> **Purpose:** How agent identities work — GitHub accounts, authentication, and audit trails.

---

## Identity Separation (Critical)

**Every actor has a distinct GitHub account.** This makes it trivial to audit who did what:

| Role          | GitHub Account             | Purpose                                    |
| ------------- | -------------------------- | ------------------------------------------ |
| **Human**     | `sirjamesoffordii`         | Oversight, decisions, Plus account owner   |
| **PE**        | `Principle-Engineer-Agent` | Strategic planning, system coherence       |
| **TL**        | `Alpha-Tech-Lead`          | Coordination, delegation, board management |
| **SE**        | `Software-Engineer-Agent`  | Implementation, PRs, commits               |
| **Cloud Bot** | `copilot-SE-agent[bot]`    | Simple async issues (overflow)             |

---

## GitHub Auth Configs

Each account has its own GH CLI configuration directory:

```
C:/Users/sirja/
├── .config/gh/                        ← Human (sirjamesoffordii) - default
├── .gh-principal-engineer-agent/      ← PE (lowercase dir, account is Principle-Engineer-Agent)
├── .gh-alpha-tech-lead/               ← TL
└── .gh-software-engineer-agent/       ← SE
```

### Directory Contents

Each config directory contains:

```
.gh-<account>/
├── hosts.yml     ← Auth token and settings
└── config.yml    ← (optional) CLI preferences
```

### hosts.yml Format

```yaml
github.com:
  user: <account-name>
  oauth_token: gho_xxxxxxxxxxxxx
  git_protocol: https
```

---

## Authentication Procedure

### At Session Start

**Every agent MUST authenticate at the start of EVERY terminal session:**

```powershell
# Set identity (PE example - note lowercase directory name)
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-principal-engineer-agent"

# Verify
gh auth status
# Expected: Logged in to github.com as Principle-Engineer-Agent
```

### Quick Reference

```powershell
# PE (note: lowercase directory name)
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-principal-engineer-agent"

# TL
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-alpha-tech-lead"

# SE
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-software-engineer-agent"

# Human (reset to default)
$env:GH_CONFIG_DIR = $null
```

### New Terminal Warning

**IMPORTANT:** The `GH_CONFIG_DIR` environment variable must be set in EACH new terminal. If you open a new terminal mid-session, set it again before running `gh` commands.

### Git Credential Helper (Critical for Autonomous Operation)

**Problem:** Windows Credential Manager prompts for account selection on `git push`, blocking autonomous operation.

**Solution:** Configure git in this repo to use GH CLI for credentials:

```powershell
# Run once in the CMC-Go repo (already done)
cd "C:\Dev\CMC Go"
git config credential.helper "!gh auth git-credential"
```

**How it works:**

1. Git asks for credentials
2. Credential helper calls `gh auth git-credential`
3. GH CLI returns token from current `GH_CONFIG_DIR` config
4. No popup, no manual selection

**Verify:**

```powershell
# Should push without popup
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-principal-engineer-agent"
git push origin staging
```

**If popup still appears:** The credential helper may be overridden globally. Check:

```powershell
git config --global credential.helper  # Should be empty or match above
git config credential.helper           # Should be "!gh auth git-credential"
```

---

## Required Token Scopes

All agent accounts need these OAuth scopes for full functionality:

| Scope             | Purpose                     | Required?    |
| ----------------- | --------------------------- | ------------ |
| `repo`            | Read/write code, create PRs | **Required** |
| `workflow`        | Trigger/view GitHub Actions | **Required** |
| `project`         | Access Projects v2 (board)  | **Required** |
| `gist`            | Create gists (for sharing)  | Optional     |
| `read:org`        | Read org membership         | Optional     |
| `admin:repo_hook` | Manage webhooks             | Optional     |

### Verify Scopes

```powershell
gh auth status
# Look for "Token scopes:" line
```

### Add Missing Scope

```powershell
gh auth refresh -s project
# Follow browser flow to add scope
```

### Recommended Scope Set

When creating new accounts, use:

```powershell
gh auth login -w -s repo,workflow,project
```

---

## Creating New Agent Accounts

### Human Steps (one-time setup)

1. **Create GitHub account:**
   - Go to github.com/signup
   - Use naming convention: `<Role>-Agent` (e.g., `SE-2-Agent`)

2. **Add as collaborator:**
   - Repository → Settings → Access → Collaborators
   - Add the new account with "Write" access

3. **Create auth config:**

   ```powershell
   # Create directory
   mkdir "C:/Users/sirja/.gh-<new-account>"

   # Authenticate
   $env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-<new-account>"
   gh auth login -w
   # Follow browser flow

   # Verify
   gh auth status
   ```

4. **Update AGENTS.md:**
   - Add new account to the agents table
   - Document the config directory path

---

## Session Naming Convention

Agents rename their VS Code chat tab to show identity:

```
Format: {ID}({generation})

Examples:
  PE-1(1)    ← Principal Engineer, generation 1
  TL-1(2)    ← Tech Lead, generation 2
  SE-1(3)    ← Software Engineer 1, generation 3
  SE-2(1)    ← Software Engineer 2, generation 1
```

**How to rename:** Right-click chat tab → Rename → Enter `{ID}({N})`

This lets the human see at a glance which agents are running.

---

## Commit Attribution

All commits are attributed to the authenticated account:

```
# Commit by SE
agent(se): fix district filter logic

# Commit by TL (docs only, rare)
agent(tl): update AGENTS.md workflow

# Commit by human
user(sir-james): manual hotfix
```

### Branch Naming

```
# Agent branches
agent/<agent>/<issue#>-<slug>
Example: agent/se/42-district-filter

# Human branches
user/sir-james/<issue#>-<slug>
Example: user/sir-james/99-hotfix
```

---

## Permissions Model

| Account                    | Repo Access | Can Merge PRs | Can Delete Branches | Can Create Issues |
| -------------------------- | ----------- | ------------- | ------------------- | ----------------- |
| `sirjamesoffordii`         | Admin       | ✅            | ✅                  | ✅                |
| `Principle-Engineer-Agent` | Write       | ✅\*          | ✅                  | ✅                |
| `Alpha-Tech-Lead`          | Write       | ✅            | ✅                  | ✅                |
| `Software-Engineer-Agent`  | Write       | ❌\*\*        | ✅                  | ✅                |

\*PE rarely merges; delegates to TL
\*\*SE opens PRs; TL reviews and merges

---

## Plus Account Features

Only `sirjamesoffordii` (Plus account) has access to:

- **Cloud agent spawning** via `gh agent-task create`
- **Direct tool access** to `copilot-coding-agent`
- **Premium request quota** (1,500/month)

### Cloud Agent Workaround

TL (`Alpha-Tech-Lead`) can trigger cloud agents indirectly:

1. Apply `agent:copilot-SE` label to an Issue
2. GitHub workflow (`copilot-auto-handoff.yml`) triggers
3. Workflow uses `COPILOT_ASSIGN_TOKEN_PRO` (human's token) to spawn agent

---

## Audit Trail

### Viewing Activity by Account

```powershell
# All commits by SE
git log --author="Software-Engineer-Agent"

# All PRs by TL
gh pr list --author="Alpha-Tech-Lead" --state all

# All issues created by PE
gh issue list --author="Principle-Engineer-Agent" --state all
```

### Viewing Activity by Time

```powershell
# Commits in last 24h by any agent
git log --since="24 hours ago" --author="Agent"
```

---

## Troubleshooting

### "wrong account" on gh commands

```powershell
# Check current identity
gh auth status

# If wrong, set the correct config dir
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-<correct-account>"
gh auth status
```

### "Permission denied" errors

1. Verify account is a collaborator on the repo
2. Re-authenticate: `gh auth login -w`
3. Verify token has correct scopes: `gh auth status --show-token`

### "Token expired"

```powershell
# Re-authenticate
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-<account>"
gh auth login -w
```

### Creating a new config directory

```powershell
# If directory doesn't exist
mkdir "C:/Users/sirja/.gh-<account>"

# Then authenticate
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-<account>"
gh auth login -w
```
