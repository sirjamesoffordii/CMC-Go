# Claude Code Hooks Setup — CMC Go

> **Note:** These hooks apply to **Claude Code** (bash-based hook system). **VS Code Copilot agents do not support Claude Code hooks**, so these configurations are not active in Copilot sessions. Use them only in Claude Code environments.

## Overview

This guide documents practical hooks for the CMC Go workflow, based on reference patterns from:

- `_external/everything-claude-code/hooks/hooks.json`
- `_external/everything-claude-code/skills/continuous-learning/evaluate-session.sh`

Hooks are configured in Claude Code settings (typically `~/.claude/settings.json`) and are driven by hook **events** plus **matchers**.

## Available Hook Events (common)

Claude Code supports these primary events:

- **SessionStart** — runs at the start of a session
- **PreToolUse** — runs before a tool executes (e.g., Bash, Edit, Write)
- **PostToolUse** — runs after a tool executes
- **PreCompact** — runs before context compaction
- **Stop** — runs when the session ends

Other events may exist depending on Claude Code version, but these are the common ones used here.

## Hooks Patterns for CMC Go

### 1) Pre-push review pauses

**What it does:** Pauses before `git push` so you can review changes.

**Trigger:** `PreToolUse` with Bash commands that include `git push`.

**Why it’s useful:** Prevents accidental pushes and encourages a quick review.

**Configuration:**

```json
{
  "matcher": "tool == \"Bash\" && tool_input.command matches \"git push\"",
  "hooks": [
    {
      "type": "command",
      "command": "#!/bin/bash\n# Open editor for review before pushing\necho '[Hook] Review changes before push...' >&2\n# Uncomment your preferred editor:\n# code . 2>/dev/null\n# cursor . 2>/dev/null\necho '[Hook] Press Enter to continue with push or Ctrl+C to abort...' >&2\nread -r"
    }
  ],
  "description": "Pause before git push to review changes"
}
```

**CMC Go recommendation:** Keep enabled. It reduces accidental pushes to `staging` or the wrong branch.

---

### 2) Auto-format after edits (Prettier)

**What it does:** Runs Prettier on `.ts/.tsx/.js/.jsx` files after edits.

**Trigger:** `PostToolUse` on `Edit` tool when file extension matches JS/TS.

**Why it’s useful:** Keeps formatting consistent without manual steps.

**Configuration:**

```json
{
  "matcher": "tool == \"Edit\" && tool_input.file_path matches \\\"\\\\.(ts|tsx|js|jsx)$\\\"",
  "hooks": [
    {
      "type": "command",
      "command": "#!/bin/bash\ninput=$(cat)\nfile_path=$(echo \"$input\" | jq -r '.tool_input.file_path // \"\"')\n\nif [ -n \"$file_path\" ] && [ -f \"$file_path\" ]; then\n  if command -v prettier >/dev/null 2>&1; then\n    prettier --write \"$file_path\" 2>&1 | head -5 >&2\n  fi\nfi\n\necho \"$input\""
    }
  ],
  "description": "Auto-format JS/TS files with Prettier after edits"
}
```

**CMC Go recommendation:** Keep enabled. Prefer using the repo’s Prettier if available (`pnpm exec prettier`) when running inside a repo with a local version.

---

### 3) Console.log warnings

**What it does:** Warns when `console.log` is present in edited files and again at session end for modified files.

**Triggers:**

- `PostToolUse` for individual edits
- `Stop` for a final audit of modified files

**Why it’s useful:** Prevents debug noise from shipping.

**Configuration (PostToolUse):**

```json
{
  "matcher": "tool == \"Edit\" && tool_input.file_path matches \\\"\\\\.(ts|tsx|js|jsx)$\\\"",
  "hooks": [
    {
      "type": "command",
      "command": "#!/bin/bash\ninput=$(cat)\nfile_path=$(echo \"$input\" | jq -r '.tool_input.file_path // \"\"')\n\nif [ -n \"$file_path\" ] && [ -f \"$file_path\" ]; then\n  console_logs=$(grep -n \"console\\.log\" \"$file_path\" 2>/dev/null || true)\n  if [ -n \"$console_logs\" ]; then\n    echo \"[Hook] WARNING: console.log found in $file_path\" >&2\n    echo \"$console_logs\" | head -5 >&2\n    echo \"[Hook] Remove console.log before committing\" >&2\n  fi\nfi\n\necho \"$input\""
    }
  ],
  "description": "Warn about console.log statements after edits"
}
```

**Configuration (Stop):**

```json
{
  "matcher": "*",
  "hooks": [
    {
      "type": "command",
      "command": "#!/bin/bash\ninput=$(cat)\n\nif git rev-parse --git-dir > /dev/null 2>&1; then\n  modified_files=$(git diff --name-only HEAD 2>/dev/null | grep -E '\\.(ts|tsx|js|jsx)$' || true)\n  if [ -n \"$modified_files\" ]; then\n    has_console=false\n    while IFS= read -r file; do\n      if [ -f \"$file\" ]; then\n        if grep -q \"console\\.log\" \"$file\" 2>/dev/null; then\n          echo \"[Hook] WARNING: console.log found in $file\" >&2\n          has_console=true\n        fi\n      fi\n    done <<< \"$modified_files\"\n\n    if [ \"$has_console\" = true ]; then\n      echo \"[Hook] Remove console.log statements before committing\" >&2\n    fi\n  fi\nfi\n\necho \"$input\""
    }
  ],
  "description": "Final audit for console.log in modified files before session ends"
}
```

**CMC Go recommendation:** Keep enabled. Console logs should not land in production changes.

---

### 4) Session state persistence

**What it does:** Saves session state before compaction and restores it on new sessions.

**Triggers:**

- `PreCompact` — save state
- `SessionStart` — load state
- `Stop` — persist state on end

**Why it’s useful:** Preserves context across long sessions.

**Configuration:**

```json
{
  "PreCompact": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "~/.claude/hooks/memory-persistence/pre-compact.sh"
        }
      ],
      "description": "Save state before context compaction"
    }
  ],
  "SessionStart": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "~/.claude/hooks/memory-persistence/session-start.sh"
        }
      ],
      "description": "Load previous context on new session"
    }
  ],
  "Stop": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "~/.claude/hooks/memory-persistence/session-end.sh"
        }
      ],
      "description": "Persist session state on end"
    }
  ]
}
```

**CMC Go recommendation:** Keep enabled for long-running design or investigation sessions.

---

### 5) Continuous learning skill extraction

**What it does:** Evaluates sessions at end and signals which patterns are reusable.

**Trigger:** `Stop`

**Why it’s useful:** Promotes reusable patterns (debugging techniques, workarounds, project-specific fixes).

**Reference logic:** `_external/everything-claude-code/skills/continuous-learning/evaluate-session.sh` uses `CLAUDE_TRANSCRIPT_PATH`, requires a minimum session length, and writes learned skills under `~/.claude/skills/learned/`.

**Configuration:**

```json
{
  "matcher": "*",
  "hooks": [
    {
      "type": "command",
      "command": "~/.claude/skills/continuous-learning/evaluate-session.sh"
    }
  ],
  "description": "Evaluate session for extractable patterns"
}
```

**CMC Go recommendation:** Enable in Claude Code sessions used for debugging or architecture work. Disable for quick one-off fixes to reduce noise.

---

## Example Full Hooks Configuration (Claude Code)

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "tool == \"Bash\" && tool_input.command matches \"git push\"",
        "hooks": [
          {
            "type": "command",
            "command": "#!/bin/bash\necho '[Hook] Review changes before push...' >&2\necho '[Hook] Press Enter to continue with push or Ctrl+C to abort...' >&2\nread -r"
          }
        ],
        "description": "Pause before git push to review changes"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "tool == \"Edit\" && tool_input.file_path matches \\\"\\\\.(ts|tsx|js|jsx)$\\\"",
        "hooks": [
          {
            "type": "command",
            "command": "#!/bin/bash\ninput=$(cat)\nfile_path=$(echo \"$input\" | jq -r '.tool_input.file_path // \"\"')\n\nif [ -n \"$file_path\" ] && [ -f \"$file_path\" ]; then\n  if command -v prettier >/dev/null 2>&1; then\n    prettier --write \"$file_path\" 2>&1 | head -5 >&2\n  fi\nfi\n\necho \"$input\""
          }
        ],
        "description": "Auto-format JS/TS files with Prettier after edits"
      },
      {
        "matcher": "tool == \"Edit\" && tool_input.file_path matches \\\"\\\\.(ts|tsx|js|jsx)$\\\"",
        "hooks": [
          {
            "type": "command",
            "command": "#!/bin/bash\ninput=$(cat)\nfile_path=$(echo \"$input\" | jq -r '.tool_input.file_path // \"\"')\n\nif [ -n \"$file_path\" ] && [ -f \"$file_path\" ]; then\n  console_logs=$(grep -n \"console\\.log\" \"$file_path\" 2>/dev/null || true)\n  if [ -n \"$console_logs\" ]; then\n    echo \"[Hook] WARNING: console.log found in $file_path\" >&2\n    echo \"$console_logs\" | head -5 >&2\n    echo \"[Hook] Remove console.log before committing\" >&2\n  fi\nfi\n\necho \"$input\""
          }
        ],
        "description": "Warn about console.log statements after edits"
      }
    ],
    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/memory-persistence/pre-compact.sh"
          }
        ],
        "description": "Save state before context compaction"
      }
    ],
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/memory-persistence/session-start.sh"
          }
        ],
        "description": "Load previous context on new session"
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/memory-persistence/session-end.sh"
          }
        ],
        "description": "Persist session state on end"
      },
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/skills/continuous-learning/evaluate-session.sh"
          }
        ],
        "description": "Evaluate session for extractable patterns"
      }
    ]
  }
}
```

## Practical Notes for CMC Go

- **Copilot limitation:** These hooks do not run in VS Code Copilot agent sessions.
- **Prettier path:** Prefer `pnpm exec prettier` if you want the repo-local Prettier version.
- **Git state checks:** The Stop hook assumes a git repo; if running outside, it silently no-ops.
- **Session persistence:** Use for longer investigation sessions; disable for short, single-task sessions.
- **Continuous learning:** Best for multi-step debugging sessions where patterns are reusable.
