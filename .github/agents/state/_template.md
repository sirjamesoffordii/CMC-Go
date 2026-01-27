---
# Agent State File Template (BACKUP - MCP Memory is primary)
# Used only when MCP Memory Server is unavailable
# Copy this to create SE-1.md, TL-1.md, PE-1.md etc.
agentId: "" # e.g., SE-1, TL-1, PE-1
agentType: "" # SE, TL, or PE
generation: 1 # Increments each time agent regenerates (gen-N)
status: idle # idle, working, blocked, shutdown
currentIssue: null # Issue number currently working on (e.g., 42)
currentPR: null # PR number if one is open
workingBranch: "" # e.g., agent/se-1/42-fix-bug
worktree: "" # e.g., wt-impl-42-fix-bug
lastHeartbeat: "" # ISO timestamp of last heartbeat
lastAction: "" # Brief description of last significant action
blockers: [] # Array of strings describing any blockers
---

## Current Context

<!-- Agent writes freeform notes here about what they're working on -->
<!-- Keep this to 3-5 bullet points max — just enough to resume work -->

## Session History (last 3 sessions)

<!-- Oldest sessions scroll off. Keep max 3 entries. Format:
- **gen-N** (YYYY-MM-DD HH:MM - HH:MM): Brief summary of what was accomplished
-->

## Next Steps

<!-- What should be done next if this agent session ends -->
<!-- Keep to 2-3 specific action items -->
