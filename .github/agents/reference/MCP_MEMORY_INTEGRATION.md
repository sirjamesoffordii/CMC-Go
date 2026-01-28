# MCP Memory Server Integration

This document defines how agents use the MCP memory server for persistent knowledge across sessions.

## Memory Server Capabilities

The memory server provides a **knowledge graph** with three primitives:

### 1. Entities

Primary nodes with:

- `name` — unique identifier (use snake_case, e.g., `issue_232_status`)
- `entityType` — classification (e.g., `issue`, `decision`, `agent_session`, `pattern`)
- `observations` — array of atomic facts

### 2. Relations

Directed edges between entities:

- `from` → `to` with a `relationType` (active voice, e.g., `blocks`, `implements`, `decided_by`)

### 3. Observations

Discrete facts attached to entities:

- Should be atomic (one fact per observation)
- Can be added/removed independently

## Available Tools

| Tool                             | Purpose                     | When to Use               |
| -------------------------------- | --------------------------- | ------------------------- |
| `mcp_memory_read_graph`          | Read entire knowledge graph | Session start, cold start |
| `mcp_memory_search_nodes`        | Search by query string      | Find specific context     |
| `mcp_memory_open_nodes`          | Get specific nodes by name  | Retrieve known entities   |
| `mcp_memory_create_entities`     | Create new entities         | Persist new knowledge     |
| `mcp_memory_create_relations`    | Link entities               | Connect concepts          |
| `mcp_memory_add_observations`    | Add facts to entities       | Update existing knowledge |
| `mcp_memory_delete_entities`     | Remove entities             | Cleanup stale data        |
| `mcp_memory_delete_observations` | Remove specific facts       | Correct mistakes          |
| `mcp_memory_delete_relations`    | Remove links                | Update relationships      |

## Entity Schema (What to Store)

### Project State Entities

```
EntityType: project_state
Name: cmc_go_current_state
Observations:
  - "Current phase: Phase 1.2"
  - "Active issues: #232, #235, #240"
  - "Last board scan: 2026-01-24T21:00:00Z"
  - "Blocking issues: none"
```

### Issue Entities

```
EntityType: issue
Name: issue_<number>
Observations:
  - "Title: <title>"
  - "Status: In Progress|Verify|Blocked|Done"
  - "Assigned to: SWE-1|TL|unassigned"
  - "Complexity score: 3"
  - "Key files: server/routers.ts, client/src/components/Map.tsx"
  - "Gotcha: Requires DB seed before testing"
```

### Decision Entities

```
EntityType: decision
Name: decision_<issue#>_<slug>
Observations:
  - "Question: Should we use X or Y approach?"
  - "Decision: Y approach"
  - "Rationale: Better performance, simpler code"
  - "Decided by: TL on 2026-01-24"
  - "Applies to: issue_232"
```

### Agent Session Entities

```
EntityType: agent_session
Name: session_<agent>_<timestamp>
Observations:
  - "Agent: SWE-1"
  - "Started: 2026-01-24T20:00:00Z"
  - "Ended: 2026-01-24T21:30:00Z"
  - "Completed: issue_232, issue_235"
  - "Blocked on: issue_240 (waiting for TL decision)"
  - "Handoff notes: PR #215 ready for review"
```

### Pattern Entities (learned during work)

```
EntityType: pattern
Name: pattern_<slug>
Observations:
  - "Tags: database, auth"
  - "Problem: <what went wrong>"
  - "Solution: <what fixed it>"
  - "Discovered: 2026-01-24 during issue_232"
```

### File Context Entities

```
EntityType: file_context
Name: file_<path_slug>
Observations:
  - "Path: server/routers.ts"
  - "Purpose: Main tRPC router aggregation"
  - "Key exports: appRouter, publicProcedure, protectedProcedure"
  - "Dependencies: all server/*.router.ts files"
  - "Last modified: 2026-01-24 by SWE-1"
  - "Gotcha: Must import new routers here after creating them"
```

## Relation Types

| Relation        | From → To                     | Meaning                      |
| --------------- | ----------------------------- | ---------------------------- |
| `implements`    | issue → issue                 | Sub-issue relationship       |
| `blocks`        | issue → issue                 | Dependency                   |
| `decided_by`    | decision → agent_session      | Who made decision            |
| `learned_from`  | pattern → issue               | Where pattern was discovered |
| `modifies`      | issue → file_context          | What files an issue touches  |
| `handed_off_to` | agent_session → agent_session | Session continuity           |
| `references`    | decision → pattern            | Decision based on pattern    |

## Integration Points

### Session Start (both TL and SWE)

```
1. Read full graph: mcp_memory_read_graph()
2. Parse for:
   - Current project state
   - Active issues with status
   - Pending handoffs to you
   - Recent decisions
   - Known gotchas for files you'll touch
3. Check if there's a handoff for your role
4. Create session entity with start time
```

### During Work (triggered events)

**Write to memory when:**

- You claim an issue → Update issue entity status
- You make a significant decision → Create decision entity
- You discover a gotcha/pattern → Create pattern entity
- You're blocked → Add observation to issue entity
- You complete work → Update issue entity with completion

**Read from memory when:**

- Starting work on a file → Check file_context entity
- Making a decision → Search for related patterns/decisions
- Picking next issue → Check issue entities for blockers

### Session End (both TL and SWE)

```
1. Update session entity with:
   - End time
   - What was completed
   - What's still in progress
   - Handoff notes for next session
2. Update all touched issue entities
3. Create pattern entities for anything learned
4. Ensure project_state entity is current
```

### Handoff Protocol

When one agent needs to hand off to another:

1. **Outgoing agent** creates/updates its session entity with handoff notes
2. **Outgoing agent** creates relation: `handed_off_to` pointing to expected recipient
3. **Incoming agent** at session start searches for handoffs
4. **Incoming agent** acknowledges by adding observation to the handoff session

## Memory Hygiene (Avoiding Bloat)

### What NOT to Store

- Full file contents (use `read_file` tool instead)
- Routine command outputs (evidence lives in GitHub)
- Detailed logs (link to GitHub instead)
- Temporary debugging state

### Pruning Rules

1. **Completed issues:** After 7 days of Done status, delete issue entity
2. **Old sessions:** Keep last 10 sessions per agent, delete older
3. **Superseded decisions:** When a decision is reversed, delete old decision entity
4. **Stale file_context:** If file was deleted, delete entity

### Observation Limits

- Max 10 observations per entity
- Observations should be under 200 characters
- Consolidate related observations when approaching limit

## Example Session Flow

### TL Session Start

```
# 1. Read memory
mcp_memory_read_graph()

# 2. Check for handoffs
mcp_memory_search_nodes(query="handed_off_to TL")

# 3. Get current project state
mcp_memory_open_nodes(names=["cmc_go_current_state"])

# 4. Create session entity
mcp_memory_create_entities(entities=[{
  name: "session_tl_2026-01-24T21:00",
  entityType: "agent_session",
  observations: [
    "Agent: TL",
    "Started: 2026-01-24T21:00:00Z",
    "Status: Active"
  ]
}])
```

### SWE Claims Issue

```
# 1. Update issue entity
mcp_memory_add_observations(observations=[{
  entityName: "issue_232",
  contents: [
    "Status: In Progress",
    "Assigned to: SWE-1",
    "Claimed: 2026-01-24T21:15:00Z"
  ]
}])

# 2. Check file context for files you'll touch
mcp_memory_open_nodes(names=["file_server_routers"])
```

### SWE Discovers Gotcha

```
# Create pattern entity
mcp_memory_create_entities(entities=[{
  name: "pattern_seed_before_test",
  entityType: "pattern",
  observations: [
    "Tags: database, testing",
    "Problem: Tests fail with empty tables",
    "Solution: Run pnpm db:seed before pnpm test",
    "Discovered: 2026-01-24 during issue_232"
  ]
}])

# Link to issue
mcp_memory_create_relations(relations=[{
  from: "pattern_seed_before_test",
  to: "issue_232",
  relationType: "learned_from"
}])
```

### Session End Handoff

```
# Update session entity
mcp_memory_add_observations(observations=[{
  entityName: "session_swe1_2026-01-24T21:00",
  contents: [
    "Ended: 2026-01-24T22:30:00Z",
    "Completed: issue_232",
    "Handoff: PR #215 ready for TL review",
    "Note: issue_235 needs TL decision on approach"
  ]
}])

# Create handoff relation
mcp_memory_create_relations(relations=[{
  from: "session_swe1_2026-01-24T21:00",
  to: "TL",
  relationType: "handed_off_to"
}])
```

## Quick Reference

### Read Operations

- **Full context:** `mcp_memory_read_graph()`
- **Find something:** `mcp_memory_search_nodes(query="...")`
- **Get specific:** `mcp_memory_open_nodes(names=["entity1", "entity2"])`

### Write Operations

- **New knowledge:** `mcp_memory_create_entities(entities=[...])`
- **New connections:** `mcp_memory_create_relations(relations=[...])`
- **Add facts:** `mcp_memory_add_observations(observations=[...])`

### Delete Operations

- **Remove entities:** `mcp_memory_delete_entities(entityNames=[...])`
- **Remove facts:** `mcp_memory_delete_observations(deletions=[...])`
- **Remove links:** `mcp_memory_delete_relations(relations=[...])`

## Migration Path

To bootstrap memory from existing state:

1. Run `gh project item-list 4 --owner sirjamesoffordii --format json` to get board state
2. Create issue entities for all active issues
3. Create `cmc_go_current_state` entity with phase/milestone info
4. Let agents organically add file_context and pattern entities as they work
