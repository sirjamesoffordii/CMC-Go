---
name: CMC_GO_PATTERNS
description: Curated patterns and pitfalls for agents and humans working on CMC Go.
---

# CMC Go — Learned Patterns (Curated)

Purpose: a **small, curated** set of reusable patterns + pitfalls for agents and humans.

- This is not an operational procedure.
- Keep this short: if it grows past ~20 items, prune or consolidate.
- Prefer linking to the canonical source of truth (Issue/PR, code, schema) when possible.

## New Entry Template

```markdown
### [Short Title]

**Tags:** database, auth
**Problem:** What went wrong
**Solution:** What fixed it
**Prevention:** How to avoid it
```

## Tag Taxonomy

- **database** — schema, migrations, invariants, seed/reset
- **auth** — secrets, tokens, authentication/authorization
- **terminal** — shell/pager issues, task usage, editor hangs
- **worktree** — local worktree hygiene, collision prevention
- **ci** — checks, automation, pipelines, evidence
- **git** — git/GitHub workflows, Issues/Projects/PR flow
- **testing** — tests, fixtures, verification commands
- **deployment** — Railway/releases, post-change validation

## Patterns by Tag

### database

### Schema is the source of truth

**Tags:** database
**Problem:** Drift between code and DB definitions.
**Solution:** Treat `drizzle/schema.ts` as authoritative.
**Prevention:** Update schema first, then application code.

### Safe schema changes

**Tags:** database
**Problem:** Breaking migrations.
**Solution:** Add nullable/default columns first; push schema; update code; harden later.
**Prevention:** Avoid immediate non-nullable changes in one step.

### Data invariants must not change

**Tags:** database
**Problem:** Map/import break when keys or enums change.
**Solution:** Keep `districts.id`, `people.personId`, and status enums unchanged.
**Prevention:** Validate against `client/public/map.svg` before edits.

### Seed/reset for consistent data

**Tags:** database, testing
**Problem:** Flaky local data.
**Solution:** Use `pnpm db:seed` or `pnpm db:reset` for clean state.
**Prevention:** Seed before running data-dependent tests.

### auth

### Secrets/tokens handling (universal)

**Tags:** auth, terminal
**Problem:** Need a secret without exposing it.
**Solution:** Check env/CLI auth first; otherwise prompt via hidden terminal input; use immediately; clear.
**Prevention:** Never paste secrets in chat; never log secret values.

### Railway vars require redeploy

**Tags:** auth, deployment
**Problem:** New secrets not picked up.
**Solution:** Run `railway up --detach` (or `railway redeploy`) after setting vars.
**Prevention:** Always redeploy after Railway variable changes.

### terminal

### Terminal recovery over escalation

**Tags:** terminal
**Problem:** Pager/alternate buffer hangs.
**Solution:** Use tasks: `Agent: Recover terminal`, then `Agent: Health check`.
**Prevention:** Prefer VS Code tasks for git/gh commands.

### Avoid editor hangs in git

**Tags:** terminal, git
**Problem:** Git commands open a blocking editor.
**Solution:** Use `-c core.editor=true` or the provided tasks.
**Prevention:** Run tasks like `Git: Rebase onto staging (no editor)`.

### Long-running commands need isBackground: true

**Tags:** terminal
**Problem:** Agent stalls indefinitely waiting for commands that never exit (dev servers, watch modes, streaming logs).
**Solution:** Use `isBackground: true` for any command that runs continuously. Check output later via `get_terminal_output`.
**Prevention:** Before running a command, ask: "Does this ever exit?" If no → background. Examples: `pnpm dev`, `railway logs --follow`, any watch command.

### Use VS Code tasks for dev servers

**Tags:** terminal
**Problem:** Background processes started via `run_in_terminal` can be killed when VS Code reuses that terminal for a new command.
**Solution:** Use the `Dev: Start server` VS Code task instead of `pnpm dev` directly.
**Prevention:** For any long-running process you need to survive, prefer VS Code tasks over direct terminal commands.

### worktree

### Use worktrees for implementation

**Tags:** worktree
**Problem:** Collisions on shared branches.
**Solution:** Use `wt-impl-*` worktrees; keep changes isolated.
**Prevention:** Only skip worktrees for ≤50 LOC, 1–2 files, no schema/auth/env.

### Keep diffs small

**Tags:** worktree
**Problem:** Large diffs slow review and increase risk.
**Solution:** Make surgical changes; split work if needed.
**Prevention:** Scope changes to the smallest viable set.

### ci

### Evidence belongs in Issues/PRs

**Tags:** ci, git
**Problem:** Verification evidence gets lost in chat.
**Solution:** Post commands/results in the Issue/PR thread.
**Prevention:** Treat chat as transient, PR/Issue as durable.

### git

### Quick board status check

**Tags:** git
**Problem:** Full board query is verbose and slow.
**Solution:** Use this one-liner for actionable items:
```powershell
gh project item-list 4 --owner sirjamesoffordii --limit 20 --format json | ConvertFrom-Json | Select-Object -ExpandProperty items | Where-Object { $_.status -in @("Todo","In Progress","Blocked","Verify") } | Select-Object @{N='#';E={$_.content.number}}, status, @{N='Title';E={$_.title.Substring(0,[Math]::Min(50,$_.title.Length))}} | Format-Table -AutoSize
```
**Prevention:** Bookmark this command; run at session start and after each task.

### Projects v2 IDs are repo-specific

**Tags:** git
**Problem:** Wrong IDs break project updates.
**Solution:** Use the CMC Go Project 4 IDs below.
**Prevention:** Re-verify with `gh project view` if unsure.

```
Project Number: 4
Project ID: PVT_kwHODqX6Qs4BNUfu
Status Field ID: PVTSSF_lAHODqX6Qs4BNUfuzg8WaYA
Status Options:
   - Todo: f75ad846
   - In Progress: 47fc9ee4
   - Verify: 5351d827
   - Done: 98236657
   - Blocked: 652442a1
```

### Projects v2 status must match reality

**Tags:** git
**Problem:** TL loses track of actual progress.
**Solution:** Update status at each milestone (In Progress → Blocked/Verify → Done).
**Prevention:** Treat the board as the command center, not chat.

### Issues must be executable before handoff

**Tags:** git
**Problem:** Ambiguous issues slow or block agents.
**Solution:** Provide Goal, behavior, files, constraints, and verification steps.
**Prevention:** Use `.github/prompts/make-issue-executable.prompt.md`.

### Capture a reusable learning

**Tags:** git
**Problem:** The same pitfall repeats.
**Solution:** Add a short Learning note in the Issue/PR; promote to this file if reusable.
**Prevention:** Do the Pattern Learning Check every task.

### testing

### Use schema + seeds for tests

**Tags:** testing, database
**Problem:** Tests drift from real schema.
**Solution:** Import from `drizzle/schema.ts` and seed as needed.
**Prevention:** Prefer consistent seeded data over ad-hoc fixtures.

### deployment

### Verify after deploy

**Tags:** deployment
**Problem:** Changes land but behavior is unknown.
**Solution:** Check logs (e.g., `railway logs -n 50`) after deploys.
**Prevention:** Make log checks part of deploy routine.
