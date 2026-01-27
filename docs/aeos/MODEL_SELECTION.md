# AEOS Model Selection

Which model to use for what. Quick reference — for full workflow, see [AGENTS.md](../../AGENTS.md).

## Model Costs

| Model           | Cost | Use Case                       |
| --------------- | ---- | ------------------------------ |
| GPT 4.1         | 0×   | Trivial tasks, no premium cost |
| GPT-5.2-Codex   | 1×   | Code implementation            |
| GPT-5.2         | 1×   | General reasoning              |
| Claude Opus 4.5 | 3×   | Complex thinking, coordination |
| Cloud Agent     | SKU  | Async work (separate quota)    |

**GitHub Copilot Pro: 1,500 premium requests/month.**

---

## Role Defaults

| Role | Default Model   | Subagent Model  | Rationale                        |
| ---- | --------------- | --------------- | -------------------------------- |
| PE   | Claude Opus 4.5 | Claude Opus 4.5 | Complex planning, deep reasoning |
| TL   | Claude Opus 4.5 | GPT-5.2         | Coordination requires judgment   |
| SE   | GPT-5.2         | GPT-5.2 Codex   | Efficient implementation         |

---

## Complexity Scoring

Score tasks before routing:

| Factor        | 0 (Low)        | 1 (Med)       | 2 (High)                  |
| ------------- | -------------- | ------------- | ------------------------- |
| **Risk**      | Docs, comments | Logic, tests  | Schema, auth, env         |
| **Scope**     | 1 file         | 2–5 files     | 6+ files or cross-cutting |
| **Ambiguity** | Clear spec     | Some unknowns | Needs design/research     |

**Total score = Risk + Scope + Ambiguity (0-6)**

---

## Score → Routing

| Score | Route To               | Why                               |
| ----- | ---------------------- | --------------------------------- |
| 0-1   | PE/TL directly         | Trivial, coordination cost > work |
| 0-2   | Cloud Agent (label)    | Simple async, TL continues        |
| 2-6   | Local SE (`code chat`) | Needs judgment, continuous work   |

---

## Subagent Model Selection

| Complexity | Model         | Cost | Use Case                         |
| ---------- | ------------- | ---- | -------------------------------- |
| 0-1        | GPT 4.1       | 0×   | Trivial: docs, comments, lookups |
| 2-4        | GPT-5.2 Codex | 1×   | Standard: most implementation    |
| 5-6        | GPT-5.2       | 1×   | Complex: needs reasoning         |

**Default to GPT-5.2 (1×).** Reserve Opus (3×) for complexity 4+ only.

---

## Quick Decision Table

| Need                | Method                | Model          |
| ------------------- | --------------------- | -------------- |
| Trivial task (0-1)  | Do yourself           | GPT 4.1 (0×)   |
| Research/analysis   | `runSubagent`         | GPT-5.2 (1×)   |
| Simple async (0-2)  | Cloud Agent label     | GitHub default |
| Standard task (2-4) | Local SE              | GPT-5.2 (1×)   |
| Complex task (5-6)  | Local SE + Opus       | Opus 4.5 (3×)  |
| Bulk tasks (10+)    | Multiple cloud agents | GitHub default |

---

## Where to Check Usage

- **Authoritative:** https://github.com/settings/billing → Premium request analytics
- **VS Code sidebar:** Cached values (less reliable)
