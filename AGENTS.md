# AGENTS.md — CMC Go Agent Rules (applies to ALL agents)

This repository uses multiple AI agents running concurrently. **All agents must follow these rules.**

## Roles in this repo

- **Sir James (User):** human operator. Agents do **not** delegate tasks to Sir James. Agents **audit** Sir James's commits/PRs like any other change. See `docs/authority/USER_SIR_JAMES.md`.
- **Coordinator:** keeps all agents in sync, owns task assignment and de-confliction. See `docs/authority/CMC_GO_COORDINATOR.md`.
- **Explorer:** scouts solutions, proposes plans, and files issues with clear acceptance criteria.
- **Builder:** implements code changes in isolated worktrees and opens PRs.
- **Verifier:** runs checks/tests, validates UI flows, and reports evidence.
- **Browser:** uses browser automation/tools to configure external services (Railway/Sentry/Codecov) or verify visuals.

## Shared operating rules

1. **GitHub is the handoff bus**
   - Work is assigned and tracked via GitHub Issues (labels + assignees).
   - Updates are posted as Issue comments and/or PR comments.

**Issue assignment convention (so agents can self-discover work):**
- Every Issue should include a role label: `role:coordinator` | `role:explorer` | `role:builder` | `role:verifier` | `role:browser`
- Every Issue title should start with a role prefix:
   - `Coordinator:` / `Explorer:` / `Builder:` / `Verifier:` / `Browser:`
- If a GitHub assignee exists for that role/agent, assign it; otherwise the **role label + title prefix** is the assignment.

**How an agent finds its work:**
- Filter Issues by your role label (preferred), then scan titles for your role prefix.

2. **One surface = one owner at a time**
   - Do not edit the same file/feature area another agent is actively editing.
   - If uncertain, ask the Coordinator by commenting on the Issue.

3. **Work in worktrees (required)**
   - Primary worktree: `wt-main` (only one allowed to run `pnpm dev`).
   - Builder worktree: `wt-impl-<issue#>-<short>`
   - Verifier worktree: `wt-verify-<issue#>-<short>` (runs checks/tests; does **not** run dev server)
   - Docs worktree: `wt-docs-<YYYY-MM-DD>` (docs-only changes)

4. **Evidence gates**
   - If you claim something is fixed, include evidence: command output, screenshots, reproduction steps, or test results.
   - Prefer automated verification (`pnpm test`, `pnpm check`, Playwright) when possible.

5. **No secret handling in repo**
   - Never commit secrets/tokens to git.
   - If external configuration is required, describe *where* to set it and *how to verify*, but do not paste secrets.

## Standard update format (Issue comment)

Use this template when reporting:

**STATUS:** In Progress | Blocked | Ready for Review | Completed

**WHAT CHANGED:**
- ...

**EVIDENCE:**
- ...

**NEXT:**
- ...
