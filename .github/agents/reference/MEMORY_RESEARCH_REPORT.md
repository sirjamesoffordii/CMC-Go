# MCP Memory Server Research & Design Report

**SWE-1 Research Report — 2026-01-24**

## Executive Summary

The MCP memory server is now configured and ready for use. This report documents:

1. Memory server capabilities and tools
2. Recommended memory schema for our agent workflow
3. Integration points for TL and SWE
4. Draft documentation additions

## 1. Memory Server Capabilities

### Storage Format

- **Location:** `.agent-memory/knowledge-graph.jsonl`
- **Format:** JSON Lines (one JSON object per line)
- **Persistence:** File-based, survives VS Code restarts

### Core Primitives

| Primitive       | Description                                | Example                                                         |
| --------------- | ------------------------------------------ | --------------------------------------------------------------- |
| **Entity**      | Primary node with name, type, observations | `{name: "issue_232", entityType: "issue", observations: [...]}` |
| **Relation**    | Directed edge between entities             | `{from: "issue_232", to: "issue_230", relationType: "blocks"}`  |
| **Observation** | Atomic fact attached to entity             | `"Status: In Progress"`                                         |

### Available MCP Tools

| Tool                             | Input                                          | Output                        | Use Case                       |
| -------------------------------- | ---------------------------------------------- | ----------------------------- | ------------------------------ |
| `mcp_memory_read_graph`          | none                                           | Full graph                    | Session start, get all context |
| `mcp_memory_search_nodes`        | `query: string`                                | Matching entities + relations | Find relevant context          |
| `mcp_memory_open_nodes`          | `names: string[]`                              | Specific entities + relations | Get known entities             |
| `mcp_memory_create_entities`     | `entities: [{name, entityType, observations}]` | Created entities              | Persist new knowledge          |
| `mcp_memory_create_relations`    | `relations: [{from, to, relationType}]`        | Created relations             | Connect concepts               |
| `mcp_memory_add_observations`    | `observations: [{entityName, contents}]`       | Added observations            | Update existing knowledge      |
| `mcp_memory_delete_entities`     | `entityNames: string[]`                        | -                             | Cleanup stale data             |
| `mcp_memory_delete_observations` | `deletions: [{entityName, observations}]`      | -                             | Correct mistakes               |
| `mcp_memory_delete_relations`    | `relations: [{from, to, relationType}]`        | -                             | Update relationships           |

## 2. Recommended Memory Schema

### Entity Types

| Type            | Naming                        | Purpose                        | Lifespan            |
| --------------- | ----------------------------- | ------------------------------ | ------------------- |
| `project_state` | `cmc_go_current_state`        | Phase, milestones, blockers    | Permanent (update)  |
| `issue`         | `issue_<number>`              | Status, assignee, gotchas      | Until Done + 7 days |
| `decision`      | `decision_<issue>_<slug>`     | Resolved questions + rationale | Until superseded    |
| `pattern`       | `pattern_<slug>`              | Gotchas, solutions             | Permanent           |
| `agent_session` | `session_<agent>_<timestamp>` | Activity log, handoffs         | Keep last 10        |
| `file_context`  | `file_<path_slug>`            | Purpose, exports, dependencies | Until file deleted  |

### Relation Types

| Relation        | Meaning            | Example                                         |
| --------------- | ------------------ | ----------------------------------------------- |
| `implements`    | Sub-task of        | issue_233 implements issue_232                  |
| `blocks`        | Dependency         | issue_234 blocks issue_235                      |
| `decided_by`    | Decision source    | decision_232_approach decided_by session_tl_xxx |
| `learned_from`  | Pattern origin     | pattern_seed_first learned_from issue_232       |
| `modifies`      | File touched       | issue_232 modifies file_server_routers          |
| `handed_off_to` | Session continuity | session_swe1_xxx handed_off_to TL               |

## 3. Integration Points

### Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                        SESSION START                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. mcp_memory_read_graph()         Get full context             │
│ 2. search for handoffs             Find work passed to you      │
│ 3. check active issues             See what's in progress       │
│ 4. create session entity           Log your presence            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DURING WORK                              │
├─────────────────────────────────────────────────────────────────┤
│ READ when:                          WRITE when:                 │
│ • Starting on unfamiliar file       • Claiming an issue         │
│ • Hitting strange error             • Making key decision       │
│ • Deciding between approaches       • Discovering gotcha        │
│ • Checking for prior decisions      • Completing issue          │
│                                     • Getting blocked           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SESSION END                              │
├─────────────────────────────────────────────────────────────────┤
│ 1. update session entity           Log completions + handoff    │
│ 2. create handoff relation         Signal to next agent         │
│ 3. update project_state            Keep snapshot current        │
└─────────────────────────────────────────────────────────────────┘
```

### TL-Specific Memory Usage

| Action         | Memory Operation                     |
| -------------- | ------------------------------------ |
| Session start  | Read graph, check handoffs from SWE  |
| Delegate issue | Update issue entity with assignee    |
| Make decision  | Create decision entity               |
| Review PR      | Read related issue/pattern entities  |
| Session end    | Update project_state, create handoff |

### SWE-Specific Memory Usage

| Action          | Memory Operation                    |
| --------------- | ----------------------------------- |
| Session start   | Read graph, check handoffs from TL  |
| Claim issue     | Update issue entity with status     |
| Start on file   | Search for file_context entity      |
| Hit error       | Search for related patterns         |
| Discover gotcha | Create pattern entity               |
| Complete issue  | Update issue entity, session entity |
| Session end     | Create handoff to TL                |

## 4. Memory Hygiene Rules

### What NOT to Store

- Full file contents (use `read_file` instead)
- Routine command output (evidence in GitHub)
- Detailed logs (link to GitHub)
- Temporary debugging state

### Pruning Schedule

- Done issues: Delete after 7 days
- Old sessions: Keep last 10 per agent
- Superseded decisions: Delete when reversed
- Stale file_context: Delete if file removed

### Observation Limits

- Max 10 observations per entity
- Max 200 characters per observation
- Consolidate when approaching limits

## 5. Deliverables Created

1. **Full schema documentation:**
   [.github/agents/reference/MCP_MEMORY_INTEGRATION.md](.github/agents/reference/MCP_MEMORY_INTEGRATION.md)

2. **Draft additions to agent docs:**
   [.github/agents/reference/MEMORY_ADDITIONS_DRAFT.md](.github/agents/reference/MEMORY_ADDITIONS_DRAFT.md)

## 6. Recommended Next Steps

1. **Bootstrap initial state:**
   - Create `cmc_go_current_state` entity with current phase
   - Create entities for active issues on the board

2. **Test the integration:**
   - Have TL and SWE both run session start/end protocols
   - Verify handoffs work correctly

3. **Apply the draft additions:**
   - Review MEMORY_ADDITIONS_DRAFT.md
   - Apply to AGENTS.md and agent files
   - Remove draft file after applying

4. **Monitor and iterate:**
   - Track memory file size over time
   - Adjust pruning rules if needed
   - Add entity types as patterns emerge

## 7. Quick Start for Agents

### TL Quick Start

```
# At session start
mcp_memory_read_graph()
mcp_memory_search_nodes(query="handed_off_to TL")
mcp_memory_create_entities(entities=[{
  name: "session_tl_2026-01-24T21:00",
  entityType: "agent_session",
  observations: ["Agent: TL", "Started: 2026-01-24T21:00:00Z"]
}])
```

### SWE Quick Start

```
# At session start
mcp_memory_read_graph()
mcp_memory_search_nodes(query="handed_off_to SWE")
mcp_memory_create_entities(entities=[{
  name: "session_swe1_2026-01-24T21:00",
  entityType: "agent_session",
  observations: ["Agent: SWE-1", "Started: 2026-01-24T21:00:00Z"]
}])
```

---

**Report complete.** Memory server is ready for integration.
