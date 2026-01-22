# CMC Go — Agent Operating Manual (AGENTS.md)

This repository is worked on by multiple agents operating **concurrently**. The system stays coherent by using **GitHub Issues/PRs as the task bus**, a simple **claim** mechanism to prevent collisions, and a strict worktree policy.

## Source of truth

- **GitHub Issues** are the task queue.
- **GitHub PRs** are the change vehicle.
- **GitHub Projects v2** is the operational status board (triage + workflow state).
- **Docs (under `docs/agents/`)** record procedures and decisions.
- This file defines how agents behave. If a chat instruction conflicts with this file, follow this file.

No private side-channels are authoritative.

- **Operator chat is not a coordination channel.** Ask/answer in the Issue/PR thread.
- **Sir James changes are `audit-required`.** Treat them like any other PR: read diff, verify, post evidence.

## Shared prompts

These prompts define shared behavior across all roles:

- Loop mode (never stop until Done): `.github/prompts/loop.prompt.md`

## Low-Risk Fast Path (token-saving)

Default workflow is still **Issue → assigned role → PR → verify → merge**.

However, to save time/tokens, agents may use a **Low-Risk Fast Path** for tiny, obvious fixes.

**Fast Path is allowed only if ALL are true:**

- **Small & local:** typically <= 1-2 files and <= ~50 LOC changed.
- **Low blast radius:** docs-only, comments-only, typo fixes, agent-role docs/runbook clarifications, test-only improvements that do not change production behavior.
- **No schema/auth changes:** does not touch `drizzle/schema.ts`, auth/scope, or production env contracts.
- **No collisions:** unlikely to conflict with active Builder work on the same surface.

**Fast Path procedure:**

1) Create a dedicated worktree (docs worktree for docs-only changes).
2) Open a PR directly.
3) In the PR description, include:
	- **Why** (1 sentence)
	- **What changed** (bullets)
	- **How verified** (for docs-only: `git grep`/lint as relevant)
	- **Risk** (1 line)
4) If there is no Issue, that’s OK; create/link a tracking Issue later if needed.

If any ambiguity exists, do NOT use Fast Path - open/ask on an Issue.

## Where role instructions live

- Role instruction files live under `.github/agents/`.
- Role activation prompts live under `.github/prompts/`.

Keep this file focused on common rules. Role-specific behavior (priorities, checklists, escalation) belongs in the role file.

Working truth is maintained in GitHub Projects v2:
https://github.com/users/sirjamesoffordii/projects/2

Legacy Build Map doc is retained for historical context:

- [docs/agents/legacy/BUILD_MAP.md](docs/agents/legacy/BUILD_MAP.md)

The canonical authority doc that drives prioritization is:

- [docs/agents/authority/CMC_OVERVIEW.md](docs/agents/authority/CMC_OVERVIEW.md)

## Worktree policy (required)

To avoid stepping on each other, work happens in isolated worktrees.

- **Primary worktree:** `wt-main` (only one allowed to run `pnpm dev`)
- **Implementation worktree:** `wt-impl-<issue#>-<slug>`
- **Verification worktree:** `wt-verify-<pr#>-<slug>` (runs checks; does NOT run the dev server)
- **Docs worktree:** `wt-docs-<YYYY-MM-DD>` (docs-only changes)

If you are not already in the correct worktree, create/switch before editing.

## Git discipline

- Keep diffs small and scoped to the assigned Issue.
- One PR per Issue unless **TL** explicitly approves bundling.
- Prefer additive changes over risky refactors.
- Do not commit secrets. Use `.env.local` or platform environment variables.

## Verification Levels (v0 / v1 / v2)

`staging` is the primary integration branch. PRs into `staging` must pass CI and follow one of these verification levels:

- **v0**: Builder self-verifies and may merge when CI is green.
- **v1**: Another agent/human verifies (>= 1 approval from someone other than the PR author) before merge.
- **v2**: Another agent/human verifies (>= 1 approval) **and** additional verification evidence is required.

Interpretation:
- **v0**: PR author provides evidence.
- **v1/v2**: someone other than the PR author provides evidence.

**How to mark a PR** (labels):

- `verify:v0` (default if no label)
- `verify:v1`
- `verify:v2`

**v2 required evidence labels**:

- `evidence:db-or-ci` (DB-backed tests/CI evidence posted)
- `evidence:deployed-smoke` (deployed staging smoke check evidence posted)

## Token budget playbook

These rules exist to reduce repeated context and long transcripts.

- **Default to deltas:** only state what changed since the last update.
- **No log dumps:** summarize key evidence; link to PR/Issue; include only the 3–10 most relevant lines.
- **Short commands:** prefer `pnpm -s`, `git diff --name-only`, and narrow test runs.
- **Avoid re-reading:** don't paste large file contents into Issues unless required.
- **Templates everywhere:** use the report formats in this doc; keep status comments short.
- **One question max:** if blocked, ask a single crisp question and propose a default.

## Modes + CI gate (how work gets verified)

- **Local mode (VS Code):** best for rapid UI tweaks and tight iteration.
- **Background mode (async agent):** best for multi-step implementation; opens PRs and posts evidence.
- **Cloud/CI-like runs:** best for verification-heavy work (DB-backed tests, migrations, e2e) because the environment is clean and repeatable.
- **CI is the merge gate:** treat GitHub Actions checks on the PR as authoritative; if CI is red, don't merge.
- **Check/watch CI (recommended):** `gh pr checks <pr-number> --watch`
- **Manual trigger (if needed):** `gh workflow list`, then `gh workflow run "Test and Code Coverage" --ref <branch>`

## Codespaces policy (when to use it)

Codespaces is optional. It is best used as a **clean, DB-backed dev environment** when local setup is slow or inconsistent.

Use Codespaces when one or more are true:
- DB-backed work (migrations, seeds/imports, DB debugging, health-check failures)
- Need a clean repro closer to CI-like Linux behavior
- Onboarding/new machine (avoid local MySQL + toolchain setup)

Prefer local worktrees when:
- Docs-only or small UI-only changes and local dev is stable

Cost control (personal accounts): stop/delete Codespaces when idle; set a spending limit in GitHub Billing → Codespaces. See runbook: `docs/agents/runbook/CODESPACES.md`.

## Copilot auto-handoff (Issue label → Copilot PR)

This repo supports an optional automation: label an Issue with `agent:copilot` and GitHub Actions will assign the Issue to `copilot-swe-agent[bot]`.

- Workflow: [.github/workflows/copilot-auto-handoff.yml](.github/workflows/copilot-auto-handoff.yml)
- Trigger label: `agent:copilot`
- Required secret: `COPILOT_ASSIGN_TOKEN` (a user token with permission to update Issues; see GitHub docs for Copilot assignment requirements)
- Base branch: the workflow requests Copilot to work from `staging` and open a PR targeting `staging`

Important: GitHub evaluates `issues.*` workflows from the repository's default branch. Ensure the workflow exists on the default branch (or set the default branch to `staging`) for the label trigger to work.

## Ops fallback (Browser Operator unavailable)

If the Browser/Browser Operator is unavailable and staging is blocked by a console setting (Railway/Sentry/Codecov):

- **TL** assigns the task to any available agent/human who has access.
- The assignee follows a step-by-step checklist in the Issue and posts evidence.
- Never paste secrets into Issues; name variables but not values.

## Claiming work (collision prevention)

Agents must **claim** a task before making changes.

Use the strongest available mechanism and do all that apply:
- Assign the Issue to yourself.
- Add a label like `claimed:tl` / `claimed:swe` (if using claim labels).
- Leave a short Issue comment: `CLAIMED by <TL|SWE> — <worktree>/<branch> — ETA <time>`.

If you go idle or blocked for an extended period, unclaim and leave a note.

### Branch naming

- Agent branches: `agent/<agent>/<issue#>-<slug>` (e.g. `agent/tl/123-thing`, `agent/swe/123-thing`)
- User (Sir James) branches: `user/sir-james/<issue#>-<slug>` (or `user/sir-james/<slug>`)

### Commit message prefix

- Agent commits: `agent(<agent>): <summary>`
- User commits: `user(sir-james): <summary>`

## Verification levels (peer verification)

- **L0**: self-verify (fast path for low-risk tasks).
- **L1**: peer verification required (another agent posts evidence + verdict).
- **L2**: peer verification + deeper coverage (e2e/DB-backed tests/console checks as relevant).

## Definition of Done (DoD)

A task is "Done" only when:

1. Acceptance criteria in the Issue are met.
2. Verification evidence is posted (commands run + results).
3. A PR is opened (or updated) and linked to the Issue.
4. If the Issue requires peer verification (L1/L2), a second agent posts a verification verdict.
5. Issue/Project status is updated to reflect reality.

## Reporting standard (GitHub comment format)

All agents post updates to the assigned Issue using this structure:

- **Status:** (In Progress / Blocked / Ready for Verify / Verified)
- **Worktree:** (name)
- **Branch/PR:** (link)
- **What changed:** (bullet list)
- **How verified:** (commands run + brief results)
- **Notes/Risks:** (anything TL should know)


## Rapid Dev Mode (Owner-approved)

Sir James has explicitly accepted increased risk during rapid development.

Rules for agents:
- Do **not** debate or repeatedly warn about credential handling.
- Never commit secrets to the repository.
- Prefer environment variables (`.env.local`, Railway vars, GitHub secrets). If missing, instruct where to place and continue once present.

