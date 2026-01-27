# AEOS Spawn Procedures

How agents spawn other agents. This is detailed reference — for quick decisions, see [AGENTS.md](../../AGENTS.md#spawning-agents).

## Spawn Methods

| Method            | Blocking? | Context? | When to Use                 |
| ----------------- | --------- | -------- | --------------------------- |
| `runSubagent`     | ✅ Yes    | ✅ Full  | Research/verification tasks |
| `code chat -r -m` | ❌ No     | ✅ Same  | Spawn autonomous agents     |

**Critical:** PE→TL and TL→SE hierarchy spawns MUST use `code chat -r -m`, NOT `runSubagent`. `runSubagent` blocks the caller and returns results—it's for research, not for spawning autonomous workers.

**Never use `code chat -n`** — opens empty window, loses agent mode and workspace context.

**Cloud agents are disabled** — they cannot access MCP Memory, causing drift.

---

## Subagents (`runSubagent`)

### What They Are

Spawn a helper that reports back directly to you.

- **Blocking** — you wait for the result
- **Internal** — result comes back in the same session
- **Uses quota** — inherits caller's model cost
- **Unlimited count** — tested 6+ in parallel

### When to Use

| Agent | Good Use Cases                                   |
| ----- | ------------------------------------------------ |
| TL    | Parallel research, batch verification, synthesis |
| SE    | Parallel file analysis, quick lookups            |

### When NOT to Use

- Single implementation task → spawn autonomous SE instead
- TL needs to stay responsive → use delegated session

### Execution Model

Parallel batches are all-or-nothing:

```
TL sends: [Agent1, Agent2, Agent3]
         ↓
TL is BLOCKED waiting for ALL THREE
         ↓
ALL results return at once
         ↓
NOW TL can continue
```

**Conflict prevention:** Give parallel subagents non-overlapping scopes.

---

## Delegated Sessions (`code chat -r`)

### Syntax

```powershell
# Spawn SE (reuses window, creates new chat tab)
code chat -r -m "Software Engineer" -a AGENTS.md "You are SE-1. Start."

# Spawn TL
code chat -r -m "Tech Lead" -a AGENTS.md "You are TL-1. Start."
```

### Options

| Flag | Meaning                                     |
| ---- | ------------------------------------------- |
| `-r` | Reuse window (RECOMMENDED)                  |
| `-m` | Agent mode (from `.agent.md` name field)    |
| `-a` | Add file context                            |
| `-n` | New window — **NEVER USE** (loses context!) |

### What Spawner Can/Cannot Do

| Can Do                    | Cannot Do                   |
| ------------------------- | --------------------------- |
| Spawn with initial prompt | See spawned agent's chat    |
| Poll GitHub for activity  | Send follow-up prompts      |
| Read workspace changes    | Get real-time responses     |
| Check board status        | Directly restart stuck chat |

---

## TL-SE Communication

Since TL cannot see spawned SE chat, communication uses **two channels**:

### Heartbeats (MCP Memory)

All agents post heartbeats to MCP Memory every 3 minutes:

```powershell
# MCP Memory heartbeat (only method)
mcp_memory_add_observations: {
  entityName: "SE-1",
  contents: ["heartbeat: 2025-01-15T14:30:00Z | Issue #123 | active"]
}
```

**Stale threshold:** 6 minutes (no heartbeat = respawn candidate)

### Work Signals (GitHub)

| Signal                   | Meaning          | TL Action       |
| ------------------------ | ---------------- | --------------- |
| `SE-CLAIMED: Issue #X`   | Working on issue | Track in board  |
| `SE-BLOCKED: #X - why`   | Needs help       | Answer on issue |
| `SE-COMPLETE: #X, PR #Y` | Ready for review | Review PR       |
| `SE-IDLE: No work`       | Board empty      | Create more     |

---

## Spawning Hierarchy

```
PE (can spawn TL only)
  └── TL (can spawn SE, secondary TL)
        └── SE (leaf — does not spawn)
```

**Strict rule:** PE spawns TL. TL spawns SE. PE does NOT spawn SE directly.

---

## Tested Limits

- Parallel `runSubagent`: 6+ (all return)
- Local sessions via `code chat -r`: 5-10 (system resources)
- Subagents do NOT count toward TL's 4-item capacity
