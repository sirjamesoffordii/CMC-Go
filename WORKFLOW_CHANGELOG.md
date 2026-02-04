# Workflow Changelog

Tracks changes to the Autonomous Agent System workflow. This is a human-readable mirror of workflow changes stored in MCP Memory.

## 2026-01-26

### Session Naming Format

- **Change:** Agent session names use `ID(gen)` format (e.g., `SE-1(3)`)
- **Reason:** Compact, clear visibility in VS Code panel
- **Previous:** `SE-1-gen-3`

### MCP Memory as Primary Storage

- **Change:** MCP Memory is now primary storage for agent states, heartbeats, and accumulated knowledge
- **Reason:** Reduces GitHub Issue noise, enables semantic search, cross-agent knowledge sharing
- **Backup:** State files at `.github/agents/state/` remain as backup if MCP unavailable

### Three System Categories Defined

1. **Accumulated Knowledge** — Patterns/lessons learned for better/faster work
2. **Agent States** — Heartbeats + current work assignments
3. **Workflow** — Everything that makes the autonomous system work

### PE Account Created

- **Account:** `Principal-Engineer-Agent`
- **Auth config:** `C:/Users/sirja/.gh-principal-engineer-agent`
- **Purpose:** Clear audit trail separating PE decisions from TL execution

### Heartbeat Protocol

- **Interval:** 3 minutes for all agents (PE, TL, SE)
- **Stale threshold:** 6 minutes
- **Storage:** MCP Memory (not GitHub Issues)

---

## How to Add Entries

When making workflow changes:

1. Add entry to MCP Memory: `mcp_memory_create_entities` with type `WorkflowChange`
2. Add human-readable entry to this file
3. Keep both in sync
