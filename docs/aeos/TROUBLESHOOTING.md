# AEOS Troubleshooting

Escape hatches when standard tools fail. Try these before escalating.

---

## Quick Reference: VS Code Tasks

| Task                         | Purpose                    |
| ---------------------------- | -------------------------- |
| `Agent: Health check`        | Verify all systems working |
| `Agent: Recover terminal`    | Reset pager environment    |
| `Git: Status`                | Safe status check          |
| `Git: Hard reset to staging` | Nuclear: discard all local |
| `Git: Rebase abort`          | Escape stuck rebase        |
| `GH: PR status (by number)`  | Check PR mergeability      |
| `GH: Checkout PR (clean)`    | Safely checkout a PR       |
| `GH: Merge PR (squash)`      | Merge and delete branch    |

---

## Terminal Stuck / "Alternate Buffer"

**Symptoms:** `run_in_terminal` returns "The command opened the alternate buffer" repeatedly.

**Fix:**

1. Run task: `Agent: Recover terminal`
2. Or: `workbench.action.terminal.killAll`
3. Then: `Agent: Health check`

---

## tasks.json Corrupted

**Symptoms:** Tasks won't run, JSON parse errors.

**Fix:**

```bash
git checkout -- .vscode/tasks.json
```

---

## Git Rebase Stuck

**Symptoms:** Rebase hangs waiting for editor.

**Fix:**

1. Run task: `Git: Rebase abort`
2. Or: `git -c core.editor=true rebase --abort`

---

## GitHub CLI Auth Issues

**Symptoms:** `gh` commands fail with auth errors.

**Fix:**

1. Check: `gh auth status`
2. Re-auth: `gh auth login`
3. For agents, verify `GH_CONFIG_DIR` is set

---

## Git Credential Popup

**Symptoms:** Windows asks which GitHub account to use.

**Fix:**

```powershell
git config --global credential.gitHubAccountFiltering false
git config --global credential.https://github.com.helper "!gh auth git-credential"
```

---

## Tool Call Cancelled

**Symptoms:** Tool call cancelled mid-execution.

**Fix:**

1. Check if tool completed (file edits, terminal output)
2. If partial: assess and continue/rollback
3. If unclear: re-run same parameters
4. For terminal: check `get_terminal_output`

**Prevention:** Break long operations into smaller steps.

---

## File Edit Desync (VS Code Buffer vs Disk)

**Symptoms:** `replace_string_in_file` fails repeatedly, or `read_file` shows different content than `Get-Content` in terminal. ESLint reports old issues after edits.

**Cause:** VS Code has unsaved in-memory buffer that differs from disk file.

**Detection:**

```powershell
# Compare what read_file sees vs disk
Get-Content "path/to/file.tsx" | Select-Object -First 10
# If different from read_file output → desync
```

**Fix:**

```powershell
# Option 1: Save all VS Code buffers
# Run VS Code command: workbench.action.files.saveAll

# Option 2: Discard VS Code buffer, use disk
git checkout -- path/to/file.tsx

# Option 3: Use PowerShell for edits (bypasses VS Code)
$c = [System.IO.File]::ReadAllText("$PWD\path\to\file.tsx")
$c = $c.Replace('oldString', 'newString')
[System.IO.File]::WriteAllText("$PWD\path\to\file.tsx", $c)
```

**Prevention:**

- Run `git status -sb` before editing to check for dirty files
- After batch edits, verify with `Get-Content | Select-Object -First N`
- If file open in VS Code, prefer terminal edits or save explicitly first

---

## VS Code `acceptResponseProgress` Glitch

**Symptoms:** Error about `acceptResponseProgress`, chat unresponsive.

**Fix:**

1. Wait 5-10 seconds
2. If stuck: Reload window (`Ctrl+Shift+P` → "Developer: Reload Window")
3. After reload:
   - Re-authenticate: `$env:GH_CONFIG_DIR = "..."; gh auth status`
   - Re-sync: `git checkout staging; git pull`
   - Check board state

---

## Agent Session Lost

**Symptoms:** Chat disappeared, VS Code crashed.

**Recovery:**

1. Check GitHub for last activity
2. Spawn new session: `.\scripts\aeos-spawn.ps1 -Agent <PE|TL|SE>`
3. New agent checks board and resumes

**Note:** `aeos-spawn.ps1` automatically closes existing windows and triggers auto-activation via the AEOS Activator extension.

---

## Health Check

Run at session start: `Agent: Health check`

Verifies:

- Terminal output works
- Git functional
- GitHub CLI authenticated
- Node/pnpm versions
- Repo state (branch, clean/dirty)

---

## Circuit Breaker

### Task-Level

After **3 consecutive failures** on same task:

1. Status → Blocked
2. Post failure summary
3. Move to next item

### Session-Level

After **10 total failures** in session:

1. Post session summary
2. Stop and await review

**Never loop infinitely on a broken path.**

---

## Schema/Migration Drift

**Symptoms:** Tests fail locally with "Unknown column" but CI passes.

**Cause:** Schema changed in `drizzle/schema.ts` but local DB missing migration.

**Fix:**

```powershell
# Push schema to local DB
pnpm db:push:yes

# Or reset and reseed
pnpm db:reset
```

**Prevention:** When changing schema:

1. Edit `drizzle/schema.ts`
2. Create migration: `pnpm drizzle-kit generate:mysql`
3. Push to local: `pnpm db:push:yes`
4. Verify: `pnpm test`

---

## Orphaned SE Work

**Symptoms:** SE pushed branch but never created PR. Branch exists on remote.

**Detection:**

```powershell
# Find branches without PRs
git fetch --prune origin
git branch -r --list "origin/agent/*"
gh pr list --state open --json headRefName

# Compare: branches that exist but have no matching PR
```

**Recovery:**

```powershell
# 1. Check branch has real commits
git log origin/agent/swe/XXX-slug --oneline -3

# 2. Create PR from orphaned branch
gh pr create --base staging --head agent/swe/XXX-slug \
  --title "[Recovered] Issue #XXX description" \
  --body "PR created by TL - SE session ended before PR creation"

# 3. Review and merge normally
gh pr checks XXX  # Wait for CI
gh pr merge XXX --squash --delete-branch
```

---

## Session Recovery Checklist

When resuming after gap (sleep, crash, context switch):

1. **Auth:** `$env:GH_CONFIG_DIR = "..."; gh auth status`
2. **Sync:** `git fetch --prune origin; git reset --hard origin/staging`
3. **Orphan scan:** Check for branches without PRs (see above)
4. **Board poll:** `gh issue list --state open`
5. **PR poll:** `gh pr list --state open`
6. **Resume loop**
