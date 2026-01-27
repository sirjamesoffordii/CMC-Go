# AEOS Memory System

> **Purpose:** How agents persist context across sessions — MCP Memory (primary) + state files (backup).

---

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Memory Server                         │
│                    (Primary Storage)                         │
│                                                             │
│  Entities:                                                  │
│  ├── Agents (PE-1, TL-1, SE-1, SE-2)                       │
│  ├── Patterns (TRPCErrorHandling, AuthFlow, ...)           │
│  ├── WorkflowChanges (HeartbeatInterval-3min, ...)         │
│  ├── SystemCategories (AEOS, ProjectBrief, ...)            │
│  └── Issues (Issue-42-DistrictFilter, ...)                 │
│                                                             │
│  Relations:                                                 │
│  ├── PE-1 → delegates-to → TL-1                            │
│  ├── TL-1 → delegates-to → SE-1                            │
│  └── PE-1 → oversees → CMC-Go-Autonomous-System            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ If unavailable
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    State Files (Backup)                      │
│                                                             │
│  .github/agents/state/                                      │
│  ├── PE-1.md                                                │
│  ├── TL-1.md                                                │
│  ├── SE-1.md                                                │
│  ├── SE-2.md                                                │
│  └── _template.md                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## MCP Memory Server

### What It Is

A persistent knowledge graph that stores entities, observations, and relations. Agents explicitly call MCP tools to read and write.

### Configuration

File: `.vscode/mcp.json`

```json
{
  "servers": {
    "memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

### NOT Automatic

**MCP Memory does NOT automatically capture anything.** Agents must explicitly:

1. **Read:** Call `mcp_memory_read_graph` at session start
2. **Write:** Call `mcp_memory_add_observations` when state changes
3. **Create:** Call `mcp_memory_create_entities` for new entities

---

## Entity Types

| Entity Type      | Purpose                                | Example                         |
| ---------------- | -------------------------------------- | ------------------------------- |
| `Agent`          | Agent state (status, work, generation) | `SE-1`, `TL-1`, `PE-1`          |
| `Pattern`        | Reusable learnings                     | `TRPCErrorHandling`, `AuthFlow` |
| `WorkflowChange` | Workflow improvements                  | `HeartbeatInterval-3min`        |
| `SystemCategory` | Meta-categories                        | `AEOS`, `ProjectBrief`          |
| `Issue`          | Issue context and learnings            | `Issue-42-DistrictFilter`       |
| `Project`        | System-level overview                  | `CMC-Go-Autonomous-System`      |

---

## MCP Operations

### Read All (Session Start)

```javascript
mcp_memory_read_graph();
// Returns: { entities: [...], relations: [...] }
```

### Create Entity

```javascript
mcp_memory_create_entities({
  entities: [
    {
      name: "SE-2",
      entityType: "Agent",
      observations: [
        "Software Engineer agent 2",
        "Uses GPT-5.2",
        "generation: 1",
        "status: idle",
      ],
    },
  ],
});
```

### Add Observations

```javascript
mcp_memory_add_observations({
  observations: [
    {
      entityName: "SE-1",
      contents: ["heartbeat: 2026-01-26T14:30:00Z | Issue #42 | working"],
    },
  ],
});
```

### Search

```javascript
mcp_memory_search_nodes({
  query: "heartbeat",
});
// Returns entities with matching observations
```

### Create Relations

```javascript
mcp_memory_create_relations({
  relations: [
    {
      from: "TL-1",
      to: "SE-2",
      relationType: "delegates-to",
    },
  ],
});
```

### Delete Entity

```javascript
mcp_memory_delete_entities({
  entityNames: ["OldEntity"],
});
```

### Delete Observations

```javascript
mcp_memory_delete_observations({
  deletions: [
    {
      entityName: "SE-1",
      observations: ["stale observation to remove"],
    },
  ],
});
```

---

## Heartbeat Protocol

All agents post heartbeats to MCP Memory:

### Format

```
heartbeat: <ISO-8601> | <context> | <status>
```

### Examples

```
PE:  heartbeat: 2026-01-26T14:30:00Z | planning
TL:  heartbeat: 2026-01-26T14:30:00Z | coordinating
SE:  heartbeat: 2026-01-26T14:30:00Z | Issue #42 | working
```

### Thresholds

| Agent | Interval | Stale Threshold | Monitored By |
| ----- | -------- | --------------- | ------------ |
| PE    | 3 min    | 6 min           | TL           |
| TL    | 3 min    | 6 min           | PE           |
| SE    | 3 min    | 6 min           | TL           |

### Posting Heartbeat

```javascript
mcp_memory_add_observations({
  observations: [
    {
      entityName: "SE-1",
      contents: ["heartbeat: 2026-01-26T14:30:00Z | Issue #42 | working"],
    },
  ],
});
```

---

## State Files (Backup)

### Purpose

Backup storage when MCP Memory is unavailable. Also useful for agent regeneration.

### Location

```
.github/agents/state/
├── PE-1.md
├── TL-1.md
├── SE-1.md
├── SE-2.md
└── _template.md
```

### Format

```yaml
---
agentId: SE-1
generation: 3
status: working
currentIssue: 42
currentPR: 156
workingBranch: agent/se/42-district-filter
lastHeartbeat: 2026-01-26T14:30:00Z
lastAction: "Opened PR #156"
blockers: []
---

## Current Context

Working on Issue #42 (District filter logic).
PR #156 is open and passing CI.

## Next Steps

1. Address review comments
2. Update tests
3. Merge when approved
```

### When to Update State Files

1. **Session end:** Always
2. **Significant milestone:** PR opened, issue claimed, blocked
3. **Before risky operations:** In case of crash

---

## Agent Regeneration

When an agent session dies (crash, timeout, human intervention):

### Detection

Supervisor (TL for SE, PE for TL) detects via:

1. Heartbeat missing > stale threshold
2. No GitHub activity for expected time
3. VS Code panel shows session gone

### Regeneration Steps

1. **Increment generation** in MCP Memory:

   ```javascript
   mcp_memory_add_observations({
     observations: [
       {
         entityName: "SE-1",
         contents: ["generation: 4"],
       },
     ],
   });
   ```

2. **Spawn replacement:**

   ```powershell
   # -r reuses current window (creates new chat tab)
   code chat -r -m "Software Engineer" -a AGENTS.md "You are SE-1(4). Previous session ended. Check MCP Memory for context. Continue work."
   ```

3. **Replacement agent:**
   - Renames tab to `SE-1(4)`
   - Calls `mcp_memory_read_graph` to load context
   - If MCP unavailable, reads state file
   - Continues from where predecessor left off
   - Posts new heartbeat

---

## What to Store Where

### MCP Memory (Primary)

- **Agent states:** status, currentIssue, heartbeats
- **Patterns:** reusable lessons learned
- **WorkflowChanges:** improvements to AEOS
- **Relations:** who delegates to whom

### State Files (Backup)

- **Same info as MCP** but in markdown format
- **More detailed context** (freeform markdown body)
- **Regeneration seed:** everything needed to resume

### NOT in Memory

- **Actual code** — in the repository
- **Issue details** — on GitHub
- **CI status** — in GitHub Actions
- **Secrets** — NEVER store secrets anywhere

---

## Query Patterns

### "What is SE-1 working on?"

```javascript
mcp_memory_open_nodes({ names: ["SE-1"] });
// Check observations for currentIssue, status
```

### "Is TL alive?"

```javascript
mcp_memory_search_nodes({ query: "TL-1 heartbeat" });
// Check timestamp vs current time
```

### "What patterns exist?"

```javascript
const graph = mcp_memory_read_graph();
const patterns = graph.entities.filter(e => e.entityType === "Pattern");
```

### "Add a new pattern"

```javascript
mcp_memory_create_entities({
  entities: [
    {
      name: "NewPatternName",
      entityType: "Pattern",
      observations: [
        "What the pattern is",
        "When to use it",
        "Files involved: server/foo.ts",
      ],
    },
  ],
});
```

---

## Troubleshooting

### "MCP Memory not responding"

1. Check VS Code → MCP panel → memory server status
2. Restart VS Code if needed
3. Fall back to state files

### "Stale observations accumulating"

```javascript
mcp_memory_delete_observations({
  deletions: [
    {
      entityName: "SE-1",
      observations: ["old heartbeat to remove"],
    },
  ],
});
```

### "Agent entity doesn't exist"

```javascript
mcp_memory_create_entities({
  entities: [
    {
      name: "SE-3",
      entityType: "Agent",
      observations: ["new agent"],
    },
  ],
});
```

### "State file out of sync with MCP"

MCP Memory is authoritative. Update state file from MCP data if they diverge.
