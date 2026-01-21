# Skill: Coordination (how to stay in sync)

## Single shared state

All agents sync through GitHub artifacts:
- Issues (work requests)
- PRs (proposed changes)
- Comments (status + evidence)

No private side-channels are authoritative.

## No self-initiative

Agents do not start work just because they noticed something.
All work is explicitly claimed via GitHub Issues, and all progress/evidence is reported via Issue/PR comments.

## Continuous mode

Once assigned, continue until complete:
- Keep going through the next best step until the Issue is **Done** or truly **Blocked**.
- Don’t ask the human operator for routine direction; escalate decisions in the Issue thread (Alpha pings the human when needed).
- Prefer milestone updates with evidence over frequent check-ins.

## Operator chat is not a channel

Do not use operator chat for updates, questions, or coordination.
All progress/evidence and all questions route through the GitHub Issue/PR thread.

## Status reporting format

When updating an Issue/PR, include:
- **Status:** (In progress | Blocked | Ready for review | Done)
- **What changed:** short list
- **Evidence:** commands run and output snippets
- **Risks:** anything that might break
- **Next action:** what the next agent should do

## Sir James changes

Sir James's commits/PRs are treated as `audit-required`. Agents should:
- read the diff
- run verification
- report findings without assuming correctness
