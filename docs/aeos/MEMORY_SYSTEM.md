# AEOS Memory System

> **Purpose:** Persist agent context across sessions.
>
> **Primary:** MCP Memory (knowledge graph) • **Backup:** state files in `.github/agents/state/`

---

## Core Rules

- **Nothing is automatic.** Agents must explicitly write/read using MCP tools.
- **MCP Memory is authoritative.** State files are a fallback + regen seed.
- **No secrets.** Never store tokens/credentials in MCP Memory or state files.
- **Store decisions + status, not code.** Code lives in the repo; issue details live on GitHub.

---

## MCP Memory Server

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

---

## Entity Types

| Entity Type      | Purpose                                   | Example Name                    |
| ---------------- | ----------------------------------------- | ------------------------------- |
| `Agent`          | Runtime status + heartbeat + current work | `SE-1`, `TL-1`, `PE-1`          |
| `Issue`          | Work context + learnings tied to an issue | `Issue-42-DistrictFilter`       |
| `Pattern`        | Reusable implementation learnings         | `AuthFlow`, `TRPCErrorHandling` |
| `WorkflowChange` | Improvements to how AEOS runs             | `HeartbeatInterval-3min`        |
| `SystemCategory` | Tagging/organization                      | `AEOS`, `ProjectBrief`          |
| `Project`        | System-level context                      | `CMC-Go-Autonomous-System`      |

---

## Entity Schemas

### MCP Entity

```ts
type MemoryEntity = {
  name: string;
  entityType:
    | "Agent"
    | "Issue"
    | "Pattern"
    | "WorkflowChange"
    | "SystemCategory"
    | "Project";
  observations: string[];
};
```

### Observation Append

```ts
type ObservationAppend = {
  entityName: string;
  contents: string[];
};
```

### MCP Relation

```ts
type MemoryRelation = {
  from: string;
  to: string;
  relationType: string; // e.g. "delegates-to", "oversees"
};
```

### State File Frontmatter

```yaml
agentId: SE-1
generation: 1
status: idle | working | blocked | verify
currentIssue: 42
currentPR: 156
workingBranch: agent/se-1/42-some-slug
lastHeartbeat: 2026-01-26T14:30:00Z
lastAction: "Opened PR #156"
blockers: []
```

---

## MCP Tool Examples (One Per Tool)

### Read Graph (session start)

```javascript
mcp_memory_read_graph();
```

### Create Entities

```javascript
mcp_memory_create_entities({
  entities: [
    {
      name: "SE-2",
      entityType: "Agent",
      observations: ["generation: 1", "status: idle"],
    },
  ],
});
```

### Search Nodes

```javascript
mcp_memory_search_nodes({ query: "Issue-42" });
```

### Create Relations

```javascript
mcp_memory_create_relations({
  relations: [{ from: "TL-1", to: "SE-2", relationType: "delegates-to" }],
});
```

### Delete Entities

```javascript
mcp_memory_delete_entities({ entityNames: ["OldEntity"] });
```

### Delete Observations

```javascript
mcp_memory_delete_observations({
  deletions: [
    { entityName: "SE-1", observations: ["stale observation to remove"] },
  ],
});
```

---

## Heartbeat Protocol (Do Not Change)

### Format

```
heartbeat: <ISO-8601> | <context> | <status>
```

### Thresholds

| Agent | Interval | Stale Threshold | Monitored By |
| ----- | -------- | --------------- | ------------ |
| PE    | 3 min    | 6 min           | TL           |
| TL    | 3 min    | 6 min           | PE           |
| SE    | 3 min    | 6 min           | TL           |

### Post Heartbeat (single canonical example)

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

### Location

`.github/agents/state/PE-1.md`, `TL-1.md`, `SE-1.md`, ... plus `_template.md`

### When to Update

- Session end (always)
- Milestones (issue claimed, PR opened, blocked/unblocked)
- Before risky operations (rebases, large refactors)

---

## Agent Regeneration (When a Session Dies)

### Detection

- Heartbeat missing for **more than 6 minutes**
- Expected GitHub activity stops
- VS Code session disappears

### Minimal Recovery Steps

1. Supervisor spawns a replacement agent session.
2. Replacement reads MCP Memory first; if unavailable, reads the state file.
3. Replacement resumes work and continues heartbeats.

---

## Troubleshooting

- **Memory server down:** Check VS Code MCP panel; restart; use state files.
- **Memory vs state mismatch:** MCP Memory is authoritative; sync state file to match.
