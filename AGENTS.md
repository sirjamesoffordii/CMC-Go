# CMC Go — Agent Operating Manual (AGENTS.md)

This repository is worked on by multiple agents operating **concurrently**. The system stays coherent by using **GitHub Issues/PRs as the task bus**, a simple **claim** mechanism to prevent collisions, and a strict worktree policy.

## Agents (canonical names)

- **User (Human): Sir James** — sets direction; may override priorities; may inject code/PRs.
- **Tech Lead (TL) (AI)** — runs first by convention; defaults to triage/coordination/deconfliction.
- **Software Engineer (SWE) (AI)** — runs second by convention; defaults to implementation and peer verification.
- **Charlie (AI)** — optional/future; adds parallelism (deep verify, repro hunts, ops checks).

TL/SWE/Charlie are **universal agents** (same capabilities). The names are a coordination convention, not hard role boundaries.

Default priority order (unless the Issue says otherwise):
1) Clear the **review/verify queue** first (open items labeled `status:verify`).
2) Otherwise implement the next `status:ready` item.

## Source of truth

- **GitHub Issues** are the task queue.
- **GitHub PRs** are the change vehicle.
- **GitHub Projects v2** is the operational status board (triage + workflow state).
- **Docs/runbooks** record procedures and decisions.
- This file defines how agents behave. If a chat instruction conflicts with this file, follow this file.

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
4) If there is no Issue, that’s OK; **TL** will later link/create a tracking Issue if needed.

If any ambiguity exists, do NOT use Fast Path - open/ask on an Issue.

## Where agent instructions live

Universal agent definitions:

- Tech Lead (TL): [.github/agents/tech-lead.agent.md](.github/agents/tech-lead.agent.md)
- Software Engineer (SWE): [.github/agents/software-engineer.agent.md](.github/agents/software-engineer.agent.md)

Legacy/specialized agents (still used when helpful):

- Browser Operator: [.github/agents/browser-operator.agent.md](.github/agents/browser-operator.agent.md)

Legacy role files may exist for historical context, but the operational model is TL/SWE/Charlie.

Working truth is maintained in GitHub Projects v2:
https://github.com/users/sirjamesoffordii/projects/2

Legacy Build Map docs are retained for historical context:

- [docs/legacy/authority/BUILD_MAP.md](docs/legacy/authority/BUILD_MAP.md)
- [docs/legacy/agents/BUILD_MAP.md](docs/legacy/agents/BUILD_MAP.md)

The canonical authority doc that drives prioritization is:

- [docs/authority/CMC_OVERVIEW.md](docs/authority/CMC_OVERVIEW.md)

## Worktree policy (required)

To avoid stepping on each other, work happens in isolated worktrees.

- **Primary worktree:** `wt-main` (only one allowed to run `pnpm dev`)
- **Builder worktree:** `wt-impl-<issue#>-<slug>`
- **Verifier worktree:** `wt-verify-<pr#>-<slug>` (runs checks; does NOT run the dev server)
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

