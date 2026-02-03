# AEOS Identity System

Single source of truth for **auth + identity**: which GitHub account an actor uses, where its GH CLI config lives, and how to switch safely.

## Identity Separation (Required)

Each role is a distinct GitHub account with a distinct GH CLI config directory. This keeps audit trails clean and prevents cross-account mistakes.

| Role      | GitHub Account             | GH CLI config dir (`GH_CONFIG_DIR`)           | Primary purpose                |
| --------- | -------------------------- | --------------------------------------------- | ------------------------------ |
| Human     | `sirjamesoffordii`         | _(default)_ `C:/Users/sirja/.config/gh`       | Oversight, admin, Plus owner   |
| PE        | `Principle-Engineer-Agent` | `C:/Users/sirja/.gh-principal-engineer-agent` | Planning, coherence            |
| TL        | `Alpha-Tech-Lead`          | `C:/Users/sirja/.gh-alpha-tech-lead`          | Coordination, board management |
| SE        | `Software-Engineer-Agent`  | `C:/Users/sirja/.gh-software-engineer-agent`  | Implementation, PRs, commits   |
| Cloud Bot | `copilot-SE-agent[bot]`    | _(GitHub-hosted)_                             | Async overflow work            |

## Switching Identities (Per Terminal)

You must set `GH_CONFIG_DIR` in **every new terminal** before running `gh` or git operations that hit GitHub.

```powershell
# PE
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-principal-engineer-agent"

# TL
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-alpha-tech-lead"

# SE
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-software-engineer-agent"

# Human (reset to default)
$env:GH_CONFIG_DIR = $null
```

Verify the active identity:

```powershell
gh auth status
```

## What Identity Controls

- `gh` uses the account in the active `GH_CONFIG_DIR`.
- `git push` uses the repo credential helper which calls `gh auth git-credential`, so it also follows the active `GH_CONFIG_DIR`.
- If you forget to set `GH_CONFIG_DIR` in a new terminal, `gh` may silently use the Human default config.

## GH CLI Config Layout (What Lives Where)

Each config directory typically contains:

```
hosts.yml   # auth tokens + account mapping
config.yml  # optional preferences
```

`hosts.yml` (example):

```yaml
github.com:
  user: <account-name>
  oauth_token: gho_xxxxxxxxxxxxx
  git_protocol: https
```

## Git Credential Helper (Required)

Windows Credential Manager can pop account-selection dialogs on `git push`, blocking autonomous flows.

Configure this repo to delegate credentials to GH CLI (run once per clone/worktree):

```powershell
cd "C:\Dev\CMC Go"
git config credential.helper "!gh auth git-credential"
```

Quick verify (should not prompt):

```powershell
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-software-engineer-agent"
git push
```

## Required OAuth Scopes (Agents)

Minimum scopes for full functionality:

- `repo` (push branches, open PRs)
- `workflow` (view/trigger Actions)
- `project` (Projects v2 board)

Check scopes:

```powershell
gh auth status
```

Add missing scopes (example):

```powershell
gh auth refresh -s project
```

When logging in for the first time (recommended):

```powershell
gh auth login -w -s repo,workflow,project
```

## Provisioning a New Identity (Human Only)

When you add a new agent account:

1. Add the GitHub user as a repo collaborator (Write).
2. Create its config directory on the machine.
3. Authenticate into that directory and verify.

```powershell
mkdir "C:/Users/sirja/.gh-<new-agent-config-dir>"
$env:GH_CONFIG_DIR = "C:/Users/sirja/.gh-<new-agent-config-dir>"
gh auth login -w -s repo,workflow,project
gh auth status
```

Then update the identity table here (and any role docs that reference it).

## Credential Helper Override Check

If `git push` still prompts, a global helper may be overriding the repo setting:

```powershell
git config --global credential.helper
git config credential.helper
```

## Cloud Agents (DISABLED)

**Cloud agents are disabled** — they cannot access MCP Memory, causing drift.

All work is now routed to Local SE via `.\scripts\spawn-agent.ps1 -Agent SE`.

## Audit Trail (Quick Commands)

```powershell
git log --author="Software-Engineer-Agent"
gh pr list --author="Alpha-Tech-Lead" --state all
gh issue list --author="Principle-Engineer-Agent" --state all
```

## Troubleshooting

Keep this doc focused. For auth failures, wrong-account issues, missing scopes, or credential-helper conflicts, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
