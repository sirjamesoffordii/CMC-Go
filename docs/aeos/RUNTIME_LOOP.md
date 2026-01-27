# AEOS Runtime Loop

> **Purpose:** Day-to-day execution loop (AEOS). Keep flow moving; keep changes safe.

See also: `AGENTS.md`, `docs/aeos/PROJECT_BOARD.md`, `docs/aeos/PR_STANDARDS.md`.

## System Overview

```
PE (episodic planning epochs)
  └─ spawns/monitors
TL (continuous coordination)
  └─ delegates to Local SEs
SE (continuous implementation)
  └─ ships via GitHub: Issues → PRs → CI → Merge
```

**Note:** Cloud agents are disabled (no MCP Memory access = drift). Use local SE only.

## PE Loop (Episodic)

PE runs bounded planning bursts (“epochs”), not continuous execution.

When PE activates:

- System startup (boot AEOS)
- TL requests planning help
- Scheduled planning epoch
- Coherence drift detected

PE epoch checklist (minimum):

```
1. TL heartbeat present? If missing → spawn/restore TL
2. Board health: enough executable Issues? (target: 5–10)
3. Priority clarity: next most important work obvious?
4. Conflicts: issues fighting each other / invariants at risk?
5. Stale work: “In Progress” with no updates > 60 min?
```

PE output (single MCP summary):

```
PE Planning Epoch — <timestamp>
- Board Health: [healthy / needs work]
- Issues Ready: N executable, M need refinement
- Priority: next = Issue #X
- Actions Taken: created/refined issues, unblocked work
```

PE epoch subagents (rare; blocking by design):

- Contract: PE announces “Entering <type> epoch”, spawns N parallel subagents, and stays blocked until return.
- Exit: synthesize → one coherent action; announce “Epoch complete. System state: <summary>”.
- Must NOT: continuous execution, issue-level implementation, long-running work, “super-SE” behavior.

When to use epoch subagents (defaults):

- Decomposition (system start / major pivot) → Opus 4.5 (3×): infer intent from structure
- Recovery (long gap / PE regeneration) → Opus 4.5 (3×): rebuild context
- Arbitration (TL escalates with A/B/C) → Opus 4.5 (3×): reconcile conflicting truths
- Health Scan (periodic / milestone) → mixed: judgment + mechanical checks
- Drift Detection (board >10 stale items) → GPT-5.2 (1×): pattern match
- Coherence Check (docs edited externally) → GPT-5.2 (1×): mechanical comparison

Model selection heuristic:

- Listing things → GPT 4.1 (0×)
- Finding things / comparisons → GPT-5.2 (1×)
- Intent/why/arbitration → Opus 4.5 (3×)
- If the answer could be a JSON list, don’t use Opus.

## TL Loop (Continuous)

TL keeps execution flowing and merges work; TL does not implement code.

TL cycle (every ~3 min):

```
1. Post heartbeat to MCP Memory
2. Check SE heartbeats (alive?)
3. Poll board: Blocked → unblock/escalate; Verify → review/merge; Todo → delegate
4. Handle SE questions (Issue comments)
5. Loop
```

TL delegation decision tree:

```
Is there a Todo item?
├── YES → choose route (see AGENTS.md for scoring)
│   ├── trivial (0-1) → delegate to SE anyway (TL never edits)
│   └── standard/complex (2-6) → Local SE (code chat -r)
└── NO
    ├── board empty → ask PE for planning epoch
    └── all in progress → monitor + review PRs
```

Post-delegation verification (required): subagent reports are proposals, not facts.

- Verify Issue status is actually “In Progress”
- Verify assignee is correct
- If either is wrong, fix manually and continue

TL capacity:

- Max 4 active items per TL instance (active = “In Progress” or “Verify”)
- If capacity full: spawn secondary TL or wait

## SE Loop (Continuous)

SE ships small diffs and verifies before PR.

SE cycle:

```
1. Post heartbeat to MCP Memory
2. Todo → claim highest priority (Status → In Progress, assign self, claim marker)
3. Implement (smallest diff)
4. Verify (at least: pnpm check && pnpm test)
5. Open PR with evidence + Issue link; Status → Verify
6. Address feedback → merge; Status → Done; loop
```

SE circuit breaker:

- Task-level: 3 consecutive failures → Status Blocked, post summary, move on
- Session-level: 10 total failures → post session summary, stop and await review

## Heartbeats, Staleness, Recovery

Heartbeat cadence (canonical format in `AGENTS.md`): every 3 min; stale threshold 6 min.

Stale detection:

1. Check whether agent still producing output
2. Check Issue/PR activity (comments, commits)
3. If truly stale → spawn replacement

Orphaned work recovery (keep work if it exists)

- Orphaned = Issue “In Progress” but assigned agent is gone

Detection (TL cycle or PE epoch):

```
For each “In Progress” issue:
  1. Check MCP heartbeat
  2. If stale/missing, check GitHub activity + whether a PR exists
  3. If no activity in 6 min → orphaned
```

Recovery procedure:

1. Check for partial work (worktree/branch/PR):
   ```powershell
   Get-ChildItem "C:\Dev\CMC Go" -Directory | Where-Object { $_.Name -like "wt-impl-<issue#>*" }
   git -C "wt-impl-<issue#>-*" log --oneline origin/staging..HEAD
   ```
2. If work exists: spawn a new SE to continue and adopt existing work
3. If no work exists: move Issue back to “Todo”, remove assignee, comment `ORPHAN-RECOVERED: ...`
4. Update MCP Memory: clear stale observations; mark agent idle

## Board & PR Flow (runtime view)

```
Todo → In Progress → Verify → Done
         ↓
       Blocked
```

TL review checklist (minimum): evidence present; CI green; scope matches Issue → then squash merge + Status Done.

## Communication & Escalation

SE uses the Issue comment markers defined in `AGENTS.md` (SE-<N>-CLAIMED / -BLOCKED / -COMPLETE).

Escalate to a human only when: security-sensitive choice; destructive/irreversible action; repo invariants change.

```markdown
**Status:** Blocked
**Decision needed:** <one sentence>
**Options:**

- A) ...
- B) ...
- C) ...
  **Recommended default (if no response by <time>):** A
```

## Verification Levels

- verify:v0: author self-verifies (SE)
- verify:v1: someone else verifies (TL/SE)
- verify:v2: peer verifies + extra evidence (TL + labels)
- Evidence labels: evidence:db-or-ci, evidence:deployed-smoke

## Improvement Loop (fast iteration)

Per-PR reflection decision tree:

1. Docs could prevent the wasted time? → edit doc now
2. Non-obvious problem others will hit? → add to CMC_GO_PATTERNS.md
3. Neither → “No changes”

Session learnings (MCP Memory, immediately):

```powershell
mcp_memory_create_entities([{ name: "Pattern-<date>-<slug>", entityType: "Pattern", observations: ["<one-line>", "<avoid>"] }])
```

PE promotion (periodic): search MCP “Pattern”; if seen 2+ times → promote to CMC_GO_PATTERNS.md; clear promoted.

Iteration speed targets: reflection 10s; capture learning 30s; find doc 1m; edit doc 2m; full PR cycle 10m.

Principle: never defer improvement.
