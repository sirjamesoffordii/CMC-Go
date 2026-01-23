---
name: CMC_GO_PATTERNS
description: Curated patterns and pitfalls for agents and humans working on CMC Go.
applyTo: "**"
---

# CMC Go — Learned Patterns (Curated)

Purpose: a **small, curated** set of reusable patterns + pitfalls for agents and humans.

- This is not an operational procedure.
- Keep this short: if it grows past ~20 items, prune or consolidate.
- Prefer linking to the canonical source of truth (Issue/PR, code, schema) when possible.

## When to use this

Use this when you are:

- repeating a failure pattern (tests, migrations, CI)
- blocked on a repo-specific invariant (schema keys, map ids)
- about to make a wide change and want known hazards

If you need step-by-step operational procedures (Railway/Sentry/CI, etc.), consult the operational procedures index: `.github/_unused/docs/agents/operational-procedures/OPERATIONAL_PROCEDURES_INDEX.md`.

## Patterns

### Invariants

- `districts.id` (DistrictSlug) must match `client/public/map.svg` `<path id="...">` values (case-sensitive).
- `people.personId` (varchar) is the cross-table/import key; preserve its semantics.
- Status enum strings are fixed: `Yes`, `Maybe`, `No`, `Not Invited`.

### Workflow / hygiene

- Keep diffs small and scoped; prefer surgical fixes.
- Use worktrees locally; never work directly on `staging`.
- Put durable progress/evidence in the Issue/PR thread; chat is transient.
- **Always update Projects v2 status** — this is how the operator knows what's happening.

### Projects v2 is the command center

The operator watches the project board, not chat. Always:

1. **Before starting:** Set Status → In Progress, assign yourself
2. **When blocked:** Set Status → Blocked, post A/B/C decision in Issue
3. **When PR opened:** Set Status → Verify
4. **After merge:** Set Status → Done

Project board: https://github.com/users/sirjamesoffordii/projects/2

If an issue isn't in the project, add it:

```bash
gh project item-add 2 --owner sirjamesoffordii --url <issue-url>
```

### Issue quality (before handoff to agent)

An issue is **not executable** if it has:

- "Implement scope as described in BUILD_MAP" (BUILD_MAP is archived)
- Generic acceptance criteria (same checkboxes on every issue)
- No file pointers (agent must search entire codebase)
- No behavioral spec (ambiguous what "default" or "improved" means)

Before assigning an issue to an agent, ensure it has:

1. **Goal** — one sentence, user-visible outcome
2. **Behavioral spec** — trigger → before → after → edge cases
3. **Surface area** — files to change + patterns to follow
4. **Constraints** — what must NOT break
5. **Verification** — exact commands + manual steps

Use `.github/prompts/make-issue-executable.prompt.md` to retrofit issues.

**Example of a bad issue:**

```
Build Map: Phase 2 -- Default district panel
Acceptance: Implement scope as described in BUILD_MAP
```

**Example of a good issue:**

```
Goal: When app loads at `/` with no `?district=` param, show South Texas panel.
Trigger: App loads at root URL
Before: No district selected
After: South Texas panel visible
Files: client/src/pages/Home.tsx — modify getSelectedDistrictIdInitial()
Constraint: URL param `?district=xyz` must still take precedence
Verify: pnpm check && pnpm test; manual: open localhost:5173, observe panel
```

### “Learning capture” rule

If you solved a non-trivial problem, capture one reusable takeaway:

- Add a short **Learning:** bullet to the Issue/PR comment alongside evidence.
- If it’s general and likely to recur, distill it into this file (and keep it short).

## Windows / Terminal Self-Recovery

**When you hit "alternate buffer" or stuck terminal:**

1. **First:** Run VS Code task `Agent: Recover terminal` (resets pager env vars).
2. **If still stuck:** Run VS Code task `Agent: Health check` to confirm terminal works.
3. **If health check fails:** Use VS Code tasks exclusively (no `run_in_terminal`).
4. **Last resort:** Escalate to operator only if all tasks also fail.

**Pattern: Prefer tasks over `run_in_terminal` for git/gh commands.**

The workspace has pre-configured tasks that bypass pager issues:

| Symptom                          | Use This Task                |
| -------------------------------- | ---------------------------- |
| `run_in_terminal` hangs on git   | `Git: Status`                |
| Stuck rebase                     | `Git: Rebase abort`          |
| Need to checkout a PR cleanly    | `GH: Checkout PR (clean)`    |
| Need to start fresh on staging   | `Git: Hard reset to staging` |
| Terminal completely unresponsive | `Agent: Recover terminal`    |

**Pattern: When editing tasks.json, read the full file first.**

Partial reads → corrupted JSON. Either:

- Read entire file before editing
- Or use `git checkout -- .vscode/tasks.json` to reset if corrupted

**Pattern: Git operations that may open editors.**

Always use `-c core.editor=true` to prevent hanging:

```bash
git -c core.editor=true rebase --abort
git -c core.editor=true merge --abort
```

The `Git: Rebase onto staging (no editor)` task already does this.

**Escalation threshold:**

- **Do NOT escalate** for terminal/pager issues — use tasks.
- **Do NOT escalate** for stuck rebase — use `Git: Rebase abort` task.
- **DO escalate** if: all recovery tasks fail, or operator login required (gh auth, Railway).

## Database / Schema Patterns

**Schema file is authoritative:** `drizzle/schema.ts` is the single source of truth for database structure.

**Safe schema changes:**

1. Add columns as nullable or with defaults first
2. Run `pnpm db:push:yes` (dev) or migrations (prod)
3. Update application code
4. (Optional) make columns non-nullable in a follow-up migration

**Test data patterns:**

- Use `pnpm db:seed` for consistent local test data
- Test files can import from `drizzle/schema.ts` directly
- Mock `db` calls in unit tests; use real DB only in integration tests

**Common pitfalls:**

- Don't rename `people.personId` — it's the cross-table import key
- Don't change enum values (`Yes`, `Maybe`, `No`, `Not Invited`) — they're stored as strings
- Don't delete/rename `districts.id` values — they must match `map.svg` path IDs

**Quick reference:**

| Task                     | Command            |
| ------------------------ | ------------------ |
| Push schema changes      | `pnpm db:push:yes` |
| Seed fresh data          | `pnpm db:seed`     |
| Full reset (destructive) | `pnpm db:reset`    |
| Check schema consistency | `pnpm db:check`    |
| Verify write permissions | `pnpm db:verify`   |

## Secrets & Tokens (Universal Pattern)

**This is the default pattern for ALL secrets/tokens (Railway, GitHub, Sentry, API keys, etc.).**

### Priority order

1. **First: Try to retrieve automatically** — check if the secret is already available:
   - Environment variable (e.g., `$env:GITHUB_TOKEN`, `$env:SENTRY_AUTH_TOKEN`)
   - CLI already authenticated (e.g., `gh auth status`, `railway status`)
   - Secure storage / credential manager

2. **If not available: Prompt operator via terminal (hidden input)**

### Terminal prompt pattern (operator just pastes)

Agent runs this command — operator only needs to paste the value:

```powershell
$sec = Read-Host "Paste SECRET_NAME (hidden)" -AsSecureString; $env:_SEC = [Runtime.InteropServices.Marshal]::PtrToStringUni([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)); Remove-Variable sec -ErrorAction SilentlyContinue; Write-Host "Ready - env var set (length: $($env:_SEC.Length))"
```

Agent then uses `$env:_SEC` immediately in the same terminal session, then clears it:

```powershell
# Example: Railway
railway variables set SESSION_SECRET="$env:_SEC"; $env:_SEC = $null

# Example: GitHub token (ephemeral)
$env:GITHUB_TOKEN = $env:_SEC; $env:_SEC = $null
# ... run gh commands ...
$env:GITHUB_TOKEN = $null

# Example: Sentry
$env:SENTRY_AUTH_TOKEN = $env:_SEC; $env:_SEC = $null
# ... run sentry-cli commands ...
$env:SENTRY_AUTH_TOKEN = $null
```

### Key rules

- **NEVER** ask operator to paste secrets into chat.
- **NEVER** print/log/echo secret values.
- **ALWAYS** clear env vars immediately after use.
- **ALWAYS** use hidden input (`-AsSecureString`).
- **SAME terminal session** — env vars don't persist across terminals.

### Common services

| Service    | Check if authenticated | Set secret for                           |
| ---------- | ---------------------- | ---------------------------------------- |
| Railway    | `railway status`       | `railway variables set NAME="$env:_SEC"` |
| GitHub CLI | `gh auth status`       | `$env:GITHUB_TOKEN = $env:_SEC`          |
| Sentry CLI | `sentry-cli info`      | `$env:SENTRY_AUTH_TOKEN = $env:_SEC`     |
| npm/pnpm   | `npm whoami`           | `$env:NPM_TOKEN = $env:_SEC`             |

### Railway-specific notes

After setting a Railway variable, redeploy:

```powershell
railway up --detach   # preferred
# or
railway redeploy      # if up fails
```

Then verify with `railway logs -n 50`.
