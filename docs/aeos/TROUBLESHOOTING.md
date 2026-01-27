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
2. Spawn new session: `code chat -r -m "<agent>" -a AGENTS.md "Continue Issue #X"`
3. New agent checks board and resumes

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
