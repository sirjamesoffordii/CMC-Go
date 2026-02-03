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

### File edit desync (VS Code buffer vs disk)

**Tags:** terminal
**Problem:** `replace_string_in_file` fails or edits don't persist. `read_file` shows different content than `Get-Content` in terminal.
**Solution:** Use `git checkout -- file` to reset, or use PowerShell `[System.IO.File]::ReadAllText/WriteAllText` to bypass VS Code buffer.
**Prevention:** Before editing, run `git status -sb` to check for dirty files. After edits, verify with `Get-Content | Select-Object -First N`.

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

### Never run MCP servers manually

**Tags:** terminal
**Problem:** Running `npx @modelcontextprotocol/server-memory` in terminal makes it hang forever waiting for stdio JSON-RPC messages.
**Solution:** MCP servers are managed by VS Code, not terminal. The `.vscode/mcp.json` config tells VS Code which servers to start automatically.
**Prevention:** To test if an MCP server works, check if its tools appear in your available tools list. If not, reload VS Code (`Developer: Reload Window`).

### Recognizing command hangs vs working

**Tags:** terminal
**Problem:** Agent thinks command is "working" when it's actually hung waiting for input.
**Solution:** Most commands complete in <30 seconds. If no output for 60+ seconds, it's likely hung. Cancel and retry with flags/env vars to avoid prompts.
**Prevention:**

- Add `| cat` suffix to avoid pagers
- Add `--yes` or `--no-input` flags
- Set `$env:GIT_PAGER='cat'` before git commands
- Use VS Code tasks which have correct settings

### Use VS Code tasks for dev servers

**Tags:** terminal
**Problem:** Background processes started via `run_in_terminal` can be killed when VS Code reuses that terminal for a new command.
**Solution:** Use the `Dev: Start server` VS Code task instead of `pnpm dev` directly.
**Prevention:** For any long-running process you need to survive, prefer VS Code tasks over direct terminal commands.

### Commands that look blocking but aren't

**Tags:** terminal
**Problem:** Some commands that SHOULD complete quickly get stuck waiting for user input (pagers, confirmations, interactive prompts).
**Solution:** Pre-configure to avoid prompts. For git: `GIT_PAGER=cat`. For commands that prompt: add `-y` or `--yes` flags. For commands that open editors: use `-c core.editor=true`.
**Prevention:** Use the provided VS Code tasks which have these settings. If running directly, set env vars first: `$env:GIT_PAGER='cat'; $env:GH_PAGER='cat'`

### Fast, safe repo search (avoid Get-ChildItem recursion)

**Tags:** terminal, worktree
**Problem:** PowerShell recursion (`Get-ChildItem -Recurse`) can hang or throw `Could not find a part of the path ...` under `.worktrees/` or deep `.pnpm` folders.
**Solution:** Search only git-tracked files via `scripts/git-grep.ps1`.
**Prevention:** Prefer git-index search over filesystem traversal.

```powershell
# Fast search (only tracked files)
./scripts/git-grep.ps1 -Pattern "heartbeat" -CaseInsensitive

# Limit to a subtree
./scripts/git-grep.ps1 -Pattern "cloud agents" -Path "docs/"
```

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

### Projects v2 IDs are in AGENTS.md

**Tags:** git
**Problem:** Wrong IDs break project updates.
**Solution:** Use the IDs defined in `AGENTS.md` (single source of truth).
**Prevention:** Reference AGENTS.md for all board IDs.

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

### agent-spawning

### Spawning chat with custom agent via CLI

**Tags:** agent-spawning
**Problem:** Need to spawn SWE/TL agents programmatically without manual selection.
**Solution:** Use `-m` flag with the exact `name:` field from the agent file: `code chat -m "Software Engineer (SWE)" "Your task"`
**Example:** `code chat -m "Tech Lead (TL)" "Check board and delegate"` spawns TL.
**Key insight:** The mode identifier is the exact `name:` field (e.g., `"Software Engineer (SWE)"`, not the filename stem).

### TL spawns SE as standalone sessions

**Tags:** agent-spawning
**Problem:** TL needs to delegate implementation without blocking.
**Solution:** TL spawns SE via `.\scripts\spawn-worktree-agent.ps1`. SE runs as standalone session in isolated worktree, self-registers in heartbeat. TL monitors via heartbeat file.
**Prevention:** Never use blocking subagents for implementation. SE is always a standalone session.

### SE spawn reliability protocol

**Tags:** agent-spawning
**Problem:** SEs can stop mid-task (system sleep, context limits), leaving orphaned work.
**Solution:** Enforce timeouts: claim comment (2 min), branch push (5 min), PR creation (15 min). If SE misses checkpoint, TL creates PR from orphaned branch.
**Prevention:** SE posts claim comment immediately; pushes branch early; creates PR before 15 min mark.

### One Issue per PR (no scope creep)

**Tags:** agent-spawning, git
**Problem:** SE combines multiple issues in one PR, making review harder and git history unclear.
**Solution:** Strict 1:1 mapping — one Issue, one PR. If SE discovers related work, create new Issue.
**Prevention:** TL rejects multi-issue PRs; SE stops at issue boundary.

### Session recovery after gap

**Tags:** agent-spawning, terminal
**Problem:** After system sleep or crash, agent state is stale (heartbeats old, local branch behind).
**Solution:** Follow recovery protocol: (1) re-auth, (2) sync staging, (3) scan for orphaned branches, (4) poll board, (5) resume loop.
**Prevention:** Store recovery checklist in agent file; execute on activation if >10 min since last heartbeat.

### database

### Schema change requires migration awareness

**Tags:** database
**Problem:** Tests fail locally ("Unknown column") but CI passes (Railway has migration).
**Solution:** After schema changes: (1) run `pnpm db:push:yes` locally, (2) verify with `pnpm test`.
**Prevention:** Always sync local DB after pulling schema changes.

### Heartbeat File

### Heartbeat file is local state

**Tags:** agent-spawning
**Problem:** Agents need to track liveness without external dependencies.
**Solution:** Use `.github/agents/heartbeat.json` (gitignored). All agents update every 3 min. Stale >6 min = dead.
**Prevention:** Update heartbeat at start of every loop iteration.

### GitHub is truth, heartbeat is liveness

**Tags:** git
**Problem:** Agent trusts stale heartbeat over actual GitHub state.
**Solution:** For Issues/PRs, always verify via `gh` CLI. Heartbeat file only tracks agent liveness, not work state.
**Prevention:** After any state-changing action, verify via GitHub API.
