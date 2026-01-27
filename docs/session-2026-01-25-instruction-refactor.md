# Session Summary — January 25, 2026

## Objective

Refactor CMC Go's instruction system to eliminate redundancy, prevent drift, and ensure all instruction surfaces synergize without duplication.

---

## Problem Statement

The repo had multiple instruction files with overlapping content:

- `.github/copilot-instructions.md` — repo overview
- `AGENTS.md` — agent operating manual
- `.github/agents/tech-lead.agent.md` — TL role behavior
- `.github/agents/software-engineer.agent.md` — SWE role behavior
- `.github/instructions/codebase-guardrails.instructions.md` — path-scoped coding rules

Rules were defined in multiple places, leading to:

1. **Drift risk** — updating one file but not the others
2. **Contradictions** — e.g., "worktrees required" vs "low-risk exception"
3. **Bloated prompts** — same info repeated to agents multiple times
4. **Fictional instructions** — references to non-existent subagent names like "SWE Opus" and "SWE Basic"

---

## Solution: Single-Ownership Model

Each rule is defined in **exactly one place**. Other files link to it.

### Ownership Map

| Category                          | Canonical Location                       |
| --------------------------------- | ---------------------------------------- |
| Workflow / delegation / evidence  | `AGENTS.md`                              |
| Repo invariants / architecture    | `.github/copilot-instructions.md`        |
| Role-specific behavior (TL / SWE) | `.github/agents/*.agent.md`              |
| Per-area coding patterns          | `.github/instructions/*.instructions.md` |

---

## Changes Made

### 1. `.github/copilot-instructions.md`

**Added:** "Where rules live (anti-drift)" section explaining file responsibilities.

**Changed:** Worktree guidance from "required; do not work on staging" to "use worktrees by default (see AGENTS.md for documented low-risk exception)" — aligning with actual policy.

### 2. `AGENTS.md`

**Added:** "Instruction Surfaces (what to edit to avoid drift)" section with explicit ownership rules.

### 3. `.github/agents/tech-lead.agent.md`

**Added:** Explicit reference to follow `AGENTS.md` for workflow and `.github/copilot-instructions.md` for invariants.

**Changed:** Docs handling from "Do directly if small, delegate if large" to "Delegate by default; do directly only if trivial" — maintaining TL discipline.

### 4. `.github/agents/software-engineer.agent.md`

**Removed:** Incorrect statement "You use Claude Opus 4.5" (the model is set in frontmatter as GPT-5.2).

**Removed:** Duplicated project status command snippets with hardcoded IDs — replaced with pointer to `AGENTS.md`.

**Removed:** Fictional subagent names (`"SWE Opus"`, `"SWE Basic"`) — replaced with accurate guidance about available agents (`"Software Engineer (SWE)"`, `"Plan"`).

**Fixed:** Broken markdown table formatting in "Common hang causes" section.

**Added:** Reference to canonical docs for workflow details.

### 5. `.github/instructions/codebase-guardrails.instructions.md`

**Changed:** `applyTo` from `"**"` (all files) to `"**/*.{ts,tsx,js,mjs}"` (code files only) — avoids bloating prompts when editing docs.

**Removed:** Duplicated content (4 modes, PR template, SWE checklist, completion report, blocked template) — all of this is in `AGENTS.md`.

**Added:** Single-line pointer: "For workflow details, use `AGENTS.md` as the canonical reference."

---

## File Responsibilities (Final State)

### `.github/copilot-instructions.md`

**Purpose:** Stable, rarely-changing repo overview.

**Contains:**

- 5-second decision tree
- Read-first list (what to read at session start)
- Where rules live (anti-drift map)
- Guardrails (high-level)
- Project invariants (districts.id, personId, status enums)
- Key entrypoints (server, routers, schema)
- Commands (dev, check, test, db)
- Pre-commit hooks note

**Does NOT contain:** Workflow details, PR templates, delegation rules.

### `AGENTS.md`

**Purpose:** Canonical operating manual — the "how we work" document.

**Contains:**

- Quick start (30 seconds to working)
- Premium request quotas
- Agent roles and identity separation
- Session start procedure
- Instruction surfaces (anti-drift ownership)
- Operating principles
- TL branch discipline
- Cold start procedure
- Circuit breaker
- Execution modes (local vs cloud)
- Delegation model (subagents vs sessions)
- Workload management
- Model selection guidance
- Standard workflow
- Evidence templates
- PR description template
- End-of-task reflection
- Verification levels
- Low-risk fast path
- Troubleshooting & escape hatches

**Does NOT contain:** Code patterns, architecture details.

### `.github/agents/tech-lead.agent.md`

**Purpose:** Role-specific behavior overlay for TL.

**Contains:**

- Session identity (GitHub account, session numbers)
- Authentication commands
- Activation procedure
- TL branch discipline (forbidden actions)
- Work type taxonomy (issue types + how to handle)
- Proactive monitoring sources
- Complexity scoring for delegation
- Execution model (subagents vs delegated sessions)
- Polling strategy
- Board-first rule

**Does NOT contain:** Templates, IDs, duplicated workflow rules.

### `.github/agents/software-engineer.agent.md`

**Purpose:** Role-specific behavior overlay for SWE.

**Contains:**

- Session identity (GitHub account, session numbers)
- Authentication commands
- Session isolation (worktrees, terminals)
- Activation scenarios
- Core loop (continuous autonomous work)
- TL-SWE communication protocol (signal markers)
- Using subagents (when available)
- Self-recovery procedures (blocked handling)

**Does NOT contain:** Hardcoded project IDs, fictional agent names, duplicated templates.

### `.github/instructions/codebase-guardrails.instructions.md`

**Purpose:** Hard invariants applied to code files.

**Contains:**

- Hard invariants (districts.id, personId, status values, branch target, diff size)
- Evidence gates (what to run based on change type)
- Pointer to AGENTS.md for workflow details

**Does NOT contain:** Modes, templates, checklists (all in AGENTS.md).

---

## Anti-Drift Rules

1. **Define each rule in exactly one place** — other files link to it
2. **Workflow/evidence/templates** → `AGENTS.md`
3. **Invariants/architecture** → `.github/copilot-instructions.md`
4. **Role behavior** → `.github/agents/*.agent.md`
5. **Code patterns** → `.github/instructions/*.instructions.md`
6. **When updating:** Edit the canonical file, not the linking files
7. **When adding new rules:** Decide which category it belongs to first

---

## Session Context (Earlier Work)

This session also included:

### Cloud Agent Token Setup

- Created `COPILOT_ASSIGN_TOKEN_PRO` repository secret
- Verified cloud agent workflow triggers correctly

### PR #271 (Merged)

- Fixed `server/peopleScope.authorization.test.ts` to expect FORBIDDEN for DISTRICT_DIRECTOR without regionId
- Aligned with fail-closed authorization behavior

### PR #273 (Merged)

- Added People Tab login gate with redirect to `/login`
- Updated E2E tests in `e2e/navigation.spec.ts` to expect redirect

### PR #272 (Ready for Review)

- Security fix: `households.getMembers` changed from `publicProcedure` to `protectedProcedure`
- Added scope-based filtering
- Added `docs/PUBLIC_ENDPOINT_SECURITY_AUDIT.md`
- Added `server/public-endpoints.audit.test.ts`
- Fixed test timeout (increased to 15s for `households.search`)

---

## Files Modified in This Refactor

```
.github/copilot-instructions.md
.github/agents/tech-lead.agent.md
.github/agents/software-engineer.agent.md
.github/instructions/codebase-guardrails.instructions.md
AGENTS.md
```

---

## Next Steps

1. Commit these changes to staging
2. Monitor that agents correctly reference canonical docs
3. If drift recurs, check which ownership rule was violated
