# Skill: Issue Workflow (sync + deconfliction)

This skill describes how agents coordinate work via GitHub Issues/PRs so they do not step on each other.

## Ownership rules

- One Issue = one owner at a time.
- Work happens only from an explicitly assigned Issue (Coordinator assigns).
- If an Issue touches a shared surface (routing, auth, schema, PeopleScope), the Coordinator must explicitly approve splitting work.

## Standard labels

- `role:coordinator`, `role:explorer`, `role:builder`, `role:verifier`, `role:browser`
- `surface:frontend`, `surface:server`, `surface:db`, `surface:infra`, `surface:docs`
- `risk:high` when touching auth/roles/visibility, schema/migrations, map-wide state

## Assignment convention (required)

So agents can self-discover their work from the Issues tab:
- Add a role label: `role:coordinator` | `role:explorer` | `role:builder` | `role:verifier` | `role:browser`
- Prefix the Issue title with the role name:
	- `Coordinator:` / `Explorer:` / `Builder:` / `Verifier:` / `Browser:`
- If an assignee exists for the role, assign it; otherwise the label + title prefix is the assignment.

## Standard Issue template (required)

- Summary
- Context / links
- Acceptance criteria (bullet list)
- Files likely to change
- Verification steps
- Risk notes

## Standard report comment (required)

- Status: (In progress / Blocked / Done)
- Evidence: commands run, screenshots, URLs
- Notes: anything surprising
- Next: what should happen next
