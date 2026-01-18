# Skill: Issue Workflow (sync + deconfliction)

This skill describes how agents coordinate work via GitHub Issues/PRs so they do not step on each other.

## Ownership rules

- One Issue = one owner at a time.
- If an Issue touches a shared surface (routing, auth, schema, PeopleScope), the Coordinator must explicitly approve splitting work.

## Standard labels

- `role:coordinator`, `role:explorer`, `role:builder`, `role:verifier`, `role:browser-operator`
- `surface:frontend`, `surface:server`, `surface:db`, `surface:infra`, `surface:docs`
- `risk:high` when touching auth/roles/visibility, schema/migrations, map-wide state

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
