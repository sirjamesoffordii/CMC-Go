# CMC Go — Workflow Prompts + Hotkeys (VS Code + Copilot)

This doc is a **copy/paste toolkit** for running the multi-agent workflow described in the Coordinator doctrine: [docs/authority/CMC_GO_COORDINATOR.md](../authority/CMC_GO_COORDINATOR.md) using VS Code + Copilot Chat.

Operational rules (how to operate day-to-day, not the authority layer): [AGENTS.md](../../AGENTS.md).

- **Agents are roles** (Coordinator/Explorer/Builder/Verifier/Browser).
- **GitHub Issues/PRs are the handoff bus**.
- **Only the Coordinator asks Sir James questions**; everyone else escalates to the Coordinator via an Issue comment.

If you need judgment doctrine: see [docs/authority/The Coherence Engine.md](../authority/The%20Coherence%20Engine.md).
If you need exact procedures: see [docs/runbooks/README.md](../runbooks/README.md).

Activation prompt files (recommended):
- [.github/prompts/coordinator.prompt.md](../../.github/prompts/coordinator.prompt.md)
- [.github/prompts/explorer.prompt.md](../../.github/prompts/explorer.prompt.md)
- [.github/prompts/builder.prompt.md](../../.github/prompts/builder.prompt.md)
- [.github/prompts/verifier.prompt.md](../../.github/prompts/verifier.prompt.md)
- [.github/prompts/browser.prompt.md](../../.github/prompts/browser.prompt.md)
- [.github/prompts/user-sir-james.prompt.md](../../.github/prompts/user-sir-james.prompt.md)

Continue prompt files (role-specific):
- [.github/prompts/cc.prompt.md](../../.github/prompts/cc.prompt.md)
- [.github/prompts/ce.prompt.md](../../.github/prompts/ce.prompt.md)
- [.github/prompts/cb.prompt.md](../../.github/prompts/cb.prompt.md)
- [.github/prompts/cv.prompt.md](../../.github/prompts/cv.prompt.md)
- [.github/prompts/cbr.prompt.md](../../.github/prompts/cbr.prompt.md)
- [.github/prompts/cu.prompt.md](../../.github/prompts/cu.prompt.md)

---

## 1) Daily “Start Here” Prompts

### 1.1 Coordinator — Daily Sync Prompt
Paste into Copilot Chat:

"""
You are the Coordinator.

Goal: produce a 10-minute execution-ready coordination pass.

Do this:
1) Read docs/authority/CMC_GO_COORDINATOR.md + docs/agents/CMC_GO_BRIEF.md quickly.
2) Identify current risk surfaces (auth/roles/visibility, schema/migrations, map state).
3) Propose 3-7 Issues to create/update with:
   - acceptance criteria
  - owner role (Explorer/Builder/Verifier/Browser)
   - verification steps
4) Call out any potential file/surface conflicts.

Stay in a tight loop:
1) Orient
2) Act
3) Report (STATUS + evidence + NEXT)

If you must ask Sir James a question, do it via GitHub mention: @sirjamesoffordII.

Output format:
- STATUS
- TOP RISKS
- ISSUE LIST (title + bullets)
- NEXT ACTIONS
"""

### 1.2 Explorer — Turn “Idea → Actionable Issue”

"""
You are the Explorer.

Task: turn the following goal into a GitHub Issue spec.
Goal: <paste goal>

Constraints:
- Do not implement code.
- Include acceptance criteria + verification steps.
- Reference real file paths/symbols you expect will change.
- If ambiguity needs a decision, write an escalation comment for the Coordinator.

Deliverable:
- Issue title
- Context
- Acceptance criteria (bullets)
- Files likely to change
- Verification steps
- Risk notes
- Coordinator escalation (if needed)
"""

### 1.3 Builder — Implement with Evidence Gates

"""
You are the Builder.

Issue: <paste issue link or issue text>

Constraints:
- Work in a Builder worktree: wt-impl-<issue#>-<short>
- Smallest viable diff; no drive-by refactors.
- Do not run the dev server.

Do:
1) Identify the smallest set of files to change.
2) Implement.
3) Run pnpm check and relevant tests.
4) Prepare a PR description with evidence.

Return:
- changed files list
- commands run (with exit codes)
- PR-ready summary
"""

### 1.4 Verifier — Independent Verification Script

"""
You are the Verifier.

Change to verify: <paste PR link or summary>

Constraints:
- Work in wt-verify-<issue#>-<short>
- Do not implement fixes.

Do:
1) State the expected behavior.
2) Run targeted verification: pnpm check, pnpm test, and any focused e2e.
3) Provide evidence and a clear verdict.

Return:
- Repro/verification steps
- Commands run + results
- Verdict (Ready / Blocked)
- If blocked: minimal Coordinator escalation comment
"""

### 1.5 Browser — “Clicks as Evidence”

"""
You are the Browser.

Task: <paste infra/console goal>

Constraints:
- Never ask for secrets.
- Prefer read-only verification.
- If change required: record every click-step and capture evidence.

Return:
- Step-by-step checklist
- Evidence links/screenshots list
- Rollback notes (if any)
"""

---

## 2) “No-Drama” Escalation Prompt (Non‑Coordinator)

Use this whenever you need a decision.

"""
Write a GitHub Issue comment in this exact format:

STATUS: Blocked

COORDINATOR INPUT NEEDED:
- Question:
- Why it matters:
- Options (A/B/C):
- Recommended default if no response by <timestamp>:

WHAT I CAN DO IN PARALLEL:
- ...

EVIDENCE:
- Links / logs / reproduction steps
"""

---

## 3) High-Value Micro-Prompts (Fast, Reusable)

### 3.1 “Find the Real Source of Truth”

"""
Locate the authoritative source for <topic>.
Return:
- the primary file(s)
- any related invariants from docs/agents/CMC_GO_BRIEF.md
- where tests live (if any)
- the smallest safe edit point
"""

### 3.2 “Risk Pass” (Auth / Scope / Data)

"""
Do a risk review for this change set.
Focus on:
- server-side authorization truth
- visibility / PII leakage
- scope correctness (region/district/campus)
- schema/migration safety
Return:
- top risks
- recommended guardrails
- verification checklist
"""

### 3.3 “Write PR Description (Evidence-First)”

"""
Write a PR description with:
- Summary (2-4 bullets)
- What changed (grouped by file)
- Evidence (commands/tests run)
- Risk notes
- Follow-ups
"""

---

## 4) Hotkeys: Recommended Setup (Windows)

VS Code + Copilot keybindings vary by install, so the reliable setup is:

1) Open **Keyboard Shortcuts** (`Ctrl+K` then `Ctrl+S`)
2) Search these command names and bind them

Bind these commands (recommended):
- **Copilot Chat: Focus on Chat View** (open/focus chat quickly)
- **Copilot Chat: New Chat** (fresh context per task)
- **Chat: Clear** (wipe the current thread if it drifts)
- **Chat: Insert at Cursor** (drop answer into editor)

Suggested bindings (low-conflict defaults on Windows):
- `Ctrl+Alt+Space` → Focus Copilot Chat
- `Ctrl+Alt+N` → New Chat
- `Ctrl+Alt+C` → Clear Chat
- `Ctrl+Alt+Enter` → Insert at Cursor

If any are taken, VS Code will tell you—pick nearby alternatives.

---

## 5) Optional: keybindings.json Snippet

To edit directly: open **Keyboard Shortcuts (JSON)** and paste/edit.

NOTE: the command IDs can differ by Copilot version. Use the Command Palette to find the exact command, then copy its ID.

Example skeleton:

```json
[
  {
    "key": "ctrl+alt+space",
    "command": "workbench.panel.chat.view.copilot.focus"
  },
  {
    "key": "ctrl+alt+n",
    "command": "workbench.action.chat.newChat"
  },
  {
    "key": "ctrl+alt+c",
    "command": "workbench.action.chat.clear"
  },
  {
    "key": "ctrl+alt+enter",
    "command": "workbench.action.chat.insertToEditor"
  }
]
```

If a command ID doesn’t exist on your machine:
- Open Command Palette
- run the command once
- re-open Keyboard Shortcuts and search it again

---

## 6) Practical Usage Patterns (What Works)

- **One chat per unit of work**: one Issue, one PR, one verification pass.
- **Start prompts by naming the role**: “You are the Builder…” to lock behavior.
- **Always ask for evidence**: commands, outputs, screenshots, repro steps.
- **Don’t let chats become journals**: reset with New Chat when scope changes.
