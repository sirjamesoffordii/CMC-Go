---
name: Agent Registry
about: Dedicated issue for agent heartbeats, spawn events, and state snapshots
title: "[REGISTRY] Agent Liveness & State"
labels: keep-open, agent-registry
assignees: ""
---

# Agent Registry

This issue tracks agent liveness through heartbeats and state snapshots.

## Active Agents

| Agent ID | Type | Status | Last Heartbeat | Current Issue |
| -------- | ---- | ------ | -------------- | ------------- |
| PE-1     | PE   | -      | -              | -             |
| TL-1     | TL   | -      | -              | -             |
| SE-1     | SE   | -      | -              | -             |
| SE-2     | SE   | -      | -              | -             |

---

## Heartbeat Protocol

Agents post heartbeats as comments using this format:

```
<AGENT-ID>-HEARTBEAT: <ISO-TIMESTAMP> | Issue #<N> | Status: <working|idle|blocked>
```

Example:

```
SE-1-HEARTBEAT: 2026-01-26T14:30:00Z | Issue #42 | Status: working
```

## Shutdown Protocol

When an agent gracefully exits, it posts:

```
<AGENT-ID>-SHUTDOWN: <ISO-TIMESTAMP> | Reason: <done|blocked|idle|error>
```

## Spawn Protocol

When TL/PE spawns an agent:

```
SPAWN: <AGENT-ID> at <ISO-TIMESTAMP> | By: <spawner-id> | State file: .github/agents/state/<id>.md
```

## Staleness Detection

| Agent Type | Heartbeat Interval | Stale Threshold | Action                |
| ---------- | ------------------ | --------------- | --------------------- |
| PE         | 5 min              | 15 min          | TL spawns replacement |
| TL         | 3 min              | 10 min          | PE spawns replacement |
| SE         | 3 min              | 10 min          | TL spawns replacement |

## State Snapshots

Agents may periodically post full state snapshots for recovery:

```markdown
STATE-SNAPSHOT: <AGENT-ID> at <ISO-TIMESTAMP>

- Status: <working|idle|blocked>
- Current Issue: #<N>
- Working Branch: <branch-name>
- Recent Actions: <summary>
- Blockers: <list or none>
- Next Steps: <what should happen next>
```

---

**Instructions:** This issue should be pinned. Do not close it.
