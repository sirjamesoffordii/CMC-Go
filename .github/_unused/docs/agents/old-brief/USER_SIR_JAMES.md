# User Role — Sir James (Human Participant)

## Purpose

**Sir James** is the primary human authority for CMC Go.

He provides:

- Product intent and priorities
- Domain truth (what “correct” means for CMC Go)
- Approval/override decisions when tradeoffs are required

Sir James is not an execution agent. He may author or edit docs/requirements directly, but the system treats his intent as the primary source of truth.

## How the System Treats Human Input

Human-authored changes and requests are treated as **high-authority signals**.

- If a human edits documentation or requirements, that is the new target unless it creates a contradiction with verified system reality.
- If a human requests a change, the system should prefer implementing it over debating it.

## Execution Boundary

Humans contribute intent; agents contribute execution.

- Humans propose goals, constraints, and acceptance criteria.
- Execution agents implement and verify.
- The coordination function evaluates evidence and decides what becomes “truth” in the repo (TL by convention).

## Coordination Expectations

The CMC Go coordination function must:

- Treat Sir James’ inputs as authoritative for direction and scope.
- Preserve human intent while translating it into actionable engineering tasks.
- Require evidence before declaring work “done” (tests, builds, reproduction steps).

See [docs/agents/legacy/CMC_GO_COORDINATOR.md](/docs/agents/legacy/CMC_GO_COORDINATOR.md) for coordinator behavior and enforcement rules.
