# Memory Integration Additions (Draft)

This document contains proposed additions to agent workflow files for MCP memory integration.

## Additions to AGENTS.md

Add after "## Session Start (once per session)" section:

```markdown
## Memory Server (cross-session continuity)

The MCP memory server provides persistent knowledge across sessions via `.agent-memory/knowledge-graph.jsonl`.

### Session Start Memory Protocol

**Before checking the board, read memory:**
```

1. mcp_memory_read_graph() — Get full context
2. Look for:
   - Handoffs addressed to your role (TL or SWE)
   - Current project state entity
   - Issues with status != Done
   - Recent patterns/gotchas
3. Create your session entity

```

### What to Store (keep it minimal)

| Entity Type | Examples | Lifespan |
|-------------|----------|----------|
| `project_state` | Phase, milestones, blocking issues | Permanent (update) |
| `issue` | Status, assignee, key files, gotchas | Until Done + 7 days |
| `decision` | Questions resolved, rationale | Until superseded |
| `pattern` | Gotchas, solutions discovered | Permanent |
| `agent_session` | Start/end, completions, handoffs | Keep last 10 |
| `file_context` | Purpose, key exports, dependencies | Until file deleted |

### When to Write Memory

| Event | Memory Action |
|-------|---------------|
| Session start | Create `agent_session` entity |
| Claim issue | Update/create `issue` entity with status |
| Make decision | Create `decision` entity |
| Discover gotcha | Create `pattern` entity |
| Complete issue | Update `issue` entity, add completion to session |
| Session end | Update `session` with handoff notes |

### When to Read Memory

| Situation | Memory Action |
|-----------|---------------|
| Session start | `read_graph()` for full context |
| Starting on a file | `search_nodes(filename)` for context |
| Making a decision | `search_nodes(topic)` for patterns/precedent |
| Debugging | `search_nodes(error)` for known issues |

### Memory Hygiene

- **Max 10 observations per entity** — consolidate if approaching
- **Delete Done issues after 7 days** — they're in GitHub history
- **Keep last 10 sessions per agent** — delete older
- **Link to GitHub, don't duplicate** — memory stores pointers, not content

See `.github/agents/reference/MCP_MEMORY_INTEGRATION.md` for full schema.
```

---

## Additions to software-engineer.agent.md

Add after "## Session Identity (critical)" section:

```markdown
## Memory Integration

### At Session Start

After authenticating, read memory for context:
```

# 1. Read full memory graph

mcp_memory_read_graph()

# 2. Look for handoffs to SWE

mcp_memory_search_nodes(query="handed_off_to SWE")

# 3. Check active issues (yours and others)

mcp_memory_search_nodes(query="Status: In Progress")

# 4. Create your session entity

mcp*memory_create_entities(entities=[{
name: "session_swe1*<ISO_timestamp>",
entityType: "agent_session",
observations: [
"Agent: SWE-1",
"Started: <ISO_timestamp>",
"Status: Active"
]
}])

```

### During Work

**Write to memory when:**
- You claim an issue → Update issue entity
- You make an implementation decision → Create decision entity
- You discover a gotcha → Create pattern entity (also add to CMC_GO_PATTERNS.md)
- You're blocked → Add observation to issue entity

**Read from memory when:**
- Starting work on unfamiliar file → `search_nodes(filename)`
- Hitting a strange error → `search_nodes(error_type)`
- Deciding between approaches → `search_nodes(topic)`

### At Session End

Before stopping, persist your context:

```

# Update your session with completion info

mcp*memory_add_observations(observations=[{
entityName: "session_swe1*<timestamp>",
contents: [
"Ended: <ISO_timestamp>",
"Completed: issue_<n>",
"In progress: issue_<m>",
"Handoff: <notes for next session>"
]
}])

# If handing off to TL

mcp*memory_create_relations(relations=[{
from: "session_swe1*<timestamp>",
to: "TL",
relationType: "handed_off_to"
}])

```

### Memory Shortcuts

| Need | Tool | Example |
|------|------|---------|
| Full context | `mcp_memory_read_graph` | Session start |
| Find something | `mcp_memory_search_nodes` | `search_nodes(query="routers")` |
| Update issue | `mcp_memory_add_observations` | Add status change |
| New discovery | `mcp_memory_create_entities` | New pattern or decision |
```

---

## Additions to tech-lead.agent.md

Add after "## Session Identity (critical)" section:

```markdown
## Memory Integration

### At Session Start

After authenticating, read memory before checking the board:
```

# 1. Read full memory graph

mcp_memory_read_graph()

# 2. Look for handoffs from SWE sessions

mcp_memory_search_nodes(query="handed_off_to TL")

# 3. Get project state

mcp_memory_open_nodes(names=["cmc_go_current_state"])

# 4. Check for blocked SWEs needing decisions

mcp_memory_search_nodes(query="Status: Blocked")

# 5. Create your session entity

mcp*memory_create_entities(entities=[{
name: "session_tl*<ISO_timestamp>",
entityType: "agent_session",
observations: [
"Agent: TL",
"Started: <ISO_timestamp>",
"Status: Active"
]
}])

```

### During Coordination

**Write to memory when:**
- You make a project decision → Create decision entity
- You delegate to SWE → Update issue entity with assignment
- You discover a workflow pattern → Create pattern entity (also add to docs)
- Board state changes significantly → Update project_state entity

**Read from memory when:**
- SWE asks a question → Check for prior decisions
- Delegating work → Check issue entity for context
- Reviewing PR → Check for related patterns

### Maintaining Project State

Keep `cmc_go_current_state` entity updated:

```

mcp_memory_add_observations(observations=[{
entityName: "cmc_go_current_state",
contents: [
"Last scan: <ISO_timestamp>",
"Active issues: #232, #235",
"Blocked: none",
"Next milestone: Phase 1.2 complete"
]
}])

```

**Prune old observations** when the list gets long:

```

mcp_memory_delete_observations(deletions=[{
entityName: "cmc_go_current_state",
observations: ["Last scan: <old_timestamp>"]
}])

```

### At Session End

Persist coordination state for next session:

```

# Update session with handoff

mcp*memory_add_observations(observations=[{
entityName: "session_tl*<timestamp>",
contents: [
"Ended: <ISO_timestamp>",
"Delegated: issue_232 to SWE-1",
"Pending reviews: PR #215, #216",
"Decisions made: <summary>",
"Handoff: <next priorities>"
]
}])

# Update project state

mcp_memory_add_observations(observations=[{
entityName: "cmc_go_current_state",
contents: ["Last TL session: <ISO_timestamp>"]
}])

```

### Memory vs GitHub (where to look)

| Information | Primary Source | Memory Stores |
|-------------|----------------|---------------|
| Issue details | GitHub Issue | Status, assignee, gotchas |
| PR content | GitHub PR | Review status, decisions |
| Board state | GitHub Projects | Snapshot timestamp, blockers |
| Code content | Files in repo | File purpose, key exports |
| Patterns | CMC_GO_PATTERNS.md | Links, discovery context |
| Decisions | Issue/PR comments | Summary, rationale |
```

---

## Summary: Memory Server Quick Reference

### Tools Available

| Tool                             | Purpose                           |
| -------------------------------- | --------------------------------- |
| `mcp_memory_read_graph`          | Read entire graph (session start) |
| `mcp_memory_search_nodes`        | Find entities by query            |
| `mcp_memory_open_nodes`          | Get specific named entities       |
| `mcp_memory_create_entities`     | Create new entities               |
| `mcp_memory_create_relations`    | Link entities together            |
| `mcp_memory_add_observations`    | Add facts to entities             |
| `mcp_memory_delete_entities`     | Remove entities                   |
| `mcp_memory_delete_observations` | Remove specific facts             |
| `mcp_memory_delete_relations`    | Remove links                      |

### Entity Naming Convention

- `cmc_go_current_state` — singleton project state
- `issue_<number>` — issue entities
- `decision_<issue>_<slug>` — decisions
- `pattern_<slug>` — learned patterns
- `session_<agent>_<timestamp>` — agent sessions
- `file_<path_slug>` — file context

### Relation Types

- `implements` — issue → issue (sub-task)
- `blocks` — issue → issue (dependency)
- `decided_by` — decision → session
- `learned_from` — pattern → issue
- `modifies` — issue → file
- `handed_off_to` — session → agent role
