# CMC Go — Agent Operating Manual (AGENTS.md)

This repository is worked on by multiple agents operating **concurrently**. The system stays coherent by using **GitHub Issues/PRs as the task bus**, strict role boundaries, and a worktree policy.

## Roles (canonical names)

- **User (Human): Sir James** — sets direction; may override priorities; may inject code/PRs.
- **Coordinator (AI)** — keeps the build moving; prevents collisions; assigns/issues work; integrates; updates Build Map/runbooks.
- **Explorer (AI)** — investigates unknowns; proposes approaches; de-risks.
- **Builder (AI)** — implements scoped changes; opens PRs.
- **Verifier (AI)** — independently validates acceptance criteria; reports evidence.
- **Browser Operator (AI)** — performs web-console work (Railway/Sentry/Codecov) and visual checks; reports evidence.

## Source of truth

- **GitHub Issues** are the task queue.
- **GitHub PRs** are the change vehicle.
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
4) If there is no Issue, that’s OK; the **Coordinator** will later link/create a tracking Issue if needed.

If any ambiguity exists, do NOT use Fast Path - open/ask on an Issue.

## Where role instructions live

Role-specific instructions (used by your VS Code agents) live here:

- Coordinator: [.github/agents/coordinator.agent.md](.github/agents/coordinator.agent.md)
- Explorer: [.github/agents/explorer.agent.md](.github/agents/explorer.agent.md)
- Builder: [.github/agents/builder.agent.md](.github/agents/builder.agent.md)
- Verifier: [.github/agents/verifier.agent.md](.github/agents/verifier.agent.md)
- Browser Operator: [.github/agents/browser-operator.agent.md](.github/agents/browser-operator.agent.md)

The two canonical authority docs that drive prioritization are:

- [docs/authority/CMC_OVERVIEW.md](docs/authority/CMC_OVERVIEW.md)
- [docs/authority/BUILD_MAP.md](docs/authority/BUILD_MAP.md)

## Worktree policy (required)

To avoid stepping on each other, work happens in isolated worktrees.

- **Primary worktree:** `wt-main` (only one allowed to run `pnpm dev`)
- **Builder worktree:** `wt-impl-<issue#>-<slug>`
- **Verifier worktree:** `wt-verify-<pr#>-<slug>` (runs checks; does NOT run the dev server)
- **Docs worktree:** `wt-docs-<YYYY-MM-DD>` (docs-only changes)

If you are not already in the correct worktree, create/switch before editing.

## Git discipline

- Keep diffs small and scoped to the assigned Issue.
- One PR per Issue unless the Coordinator explicitly approves bundling.
- Prefer additive changes over risky refactors.
- Do not commit secrets. Use `.env.local` or platform environment variables.

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

- The **Coordinator** assigns the task to any available agent/human who has access.
- The assignee follows a step-by-step checklist in the Issue and posts evidence.
- Never paste secrets into Issues; name variables but not values.

### Branch naming

- Agent branches: `agent/<role>/<issue#>-<slug>`
- User (Sir James) branches: `user/sir-james/<issue#>-<slug>` (or `user/sir-james/<slug>`)

### Commit message prefix

- Agent commits: `agent(<role>): <summary>`
- User commits: `user(sir-james): <summary>`

## Definition of Done (DoD)

A task is "Done" only when:

1. Acceptance criteria in the Issue are met.
2. Verification evidence is posted (commands run + results).
3. A PR is opened (or updated) and linked to the Issue.
4. Coordinator acknowledges integration/next steps.

## Reporting standard (GitHub comment format)

All agents post updates to the assigned Issue using this structure:

- **Status:** (In Progress / Blocked / Ready for Verify / Verified)
- **Worktree:** (name)
- **Branch/PR:** (link)
- **What changed:** (bullet list)
- **How verified:** (commands run + brief results)
- **Notes/Risks:** (anything the Coordinator should know)

## Rapid Dev Mode (Owner-approved)

Sir James has explicitly accepted increased risk during rapid development.

Rules for agents:
- Do **not** debate or repeatedly warn about credential handling.
- Never commit secrets to the repository.
- Prefer environment variables (`.env.local`, Railway vars, GitHub secrets). If missing, instruct where to place and continue once present.

