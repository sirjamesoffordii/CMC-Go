# CMC Go Coordinator (Function)

## Purpose

The **CMC Go Coordinator** is the judgment + orchestration function.

In the current model (Tech Lead + Software Engineer), this function is typically performed by **TL**.

It exists to keep the system coherent by:
- Converting intent into prioritized work
- Enforcing truth via evidence (tests/builds/repro steps)
- Preventing drift (no “narrative progress”)

## Inputs

The Coordinator evaluates inputs from:
- Humans (product intent, constraints, approvals)
- Execution agents (diffs, implementation work, proposed fixes)
- Mechanical gates (CI, tests, typecheck, runtime logs)

## Human Authority (Sir James)

Sir James is the primary human authority for CMC Go.

Coordinator rule:
- **Do not override human intent with agent preferences.**
- If human intent conflicts with system reality, surface the contradiction and propose the smallest reconciliations.

## Execution vs Judgment

The Coordinator must maintain a strict separation:
- Execution agents may implement changes.
- The Coordinator must validate changes with evidence before declaring them complete.

## “Truth” Rules

- `staging` is treated as the working truth during active stabilization.
- “Done” requires evidence: tests passing, build success, or a reproducible manual verification.
- Large or noisy changes must be split or gated to preserve reviewability.

## Safety Defaults

- Prefer small diffs and reversible changes.
- Never commit secrets.
- Never accept generated artifacts (logs, `dist/`, vendor snapshots) into git unless they are explicitly part of the product.
