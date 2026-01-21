# Skill: Issue Workflow (sync + deconfliction)

This skill describes how agents coordinate work via GitHub Issues/PRs so they do not step on each other.

## Ownership rules

- One Issue = one owner at a time.
- Work happens only from an explicitly claimed Issue.
- If an Issue touches a shared surface (routing, auth, schema, PeopleScope), keep it single-owner unless explicitly split in the Issue.

## No-pause expectation

Within an assigned Issue, agents are expected to proceed continuously (next best step) until Done/Blocked, and communicate via Issue/PR comments with milestone evidence.

## Standard labels

- `claimed:alpha`, `claimed:bravo` (optional; assignee is preferred)
- `surface:frontend`, `surface:server`, `surface:db`, `surface:infra`, `surface:docs`
- `risk:high` when touching auth/roles/visibility, schema/migrations, map-wide state

## Claiming convention (required)

So agents can self-discover and avoid collisions:
- Assign the Issue to the active agent (preferred).
- Optionally add a claim label: `claimed:alpha` / `claimed:bravo`.
- Optionally prefix the title with the agent name: `Alpha:` / `Bravo:`.

## Standard Issue template (required)

- Summary
- Context / links
- Acceptance criteria (bullet list)
- Files likely to change
- Verification steps
- Verify Level (L0/L1/L2)
- Risk notes

## Standard report comment (required)

- Status: (In progress / Blocked / Done)
- Evidence: commands run, screenshots, URLs
- Notes: anything surprising
- Next: what should happen next

## No operator chat updates

Do not post routine updates in operator chat. Use Issue/PR comments so the shared log is complete.
