# CMC Go Label Taxonomy

This document defines the label system for GitHub Issues and PRs.

## Label Categories

### Type Labels (`type:*`)

| Label               | Color     | Description      | Use For                    |
| ------------------- | --------- | ---------------- | -------------------------- |
| `type:feature`      | `#a2eeef` | New feature      | New functionality, UI, API |
| `type:bug`          | `#d73a4a` | Something broken | Errors, regressions, fixes |
| `type:chore`        | `#ededed` | Maintenance      | Cleanup, deps, config      |
| `type:docs`         | `#0075ca` | Documentation    | README, code docs, guides  |
| `type:test`         | `#fbca04` | Testing          | Unit, E2E, coverage        |
| `type:security`     | `#b60205` | Security         | Auth, RBAC, data safety    |
| `type:spike`        | `#c2e0c6` | Research         | Time-boxed exploration     |
| `type:verification` | `#f9d0c4` | Verification     | PR review tasks            |

### Complexity Labels (`complexity:*`)

| Label            | Color     | Description | Agent Routing       |
| ---------------- | --------- | ----------- | ------------------- |
| `complexity:0-2` | `#0e8a16` | Simple      | Self or Local SE    |
| `complexity:3-4` | `#fbca04` | Medium      | Local SE (GPT-5.2)  |
| `complexity:5-6` | `#d93f0b` | Complex     | Local SE (Opus 4.5) |

### Phase Labels (`phase:*`)

| Label       | Color     | Description           |
| ----------- | --------- | --------------------- |
| `phase:1`   | `#1d76db` | Phase 1: Core System  |
| `phase:1.2` | `#1d76db` | Phase 1.2: Cross-View |
| `phase:2`   | `#5319e7` | Phase 2: Desktop UX   |
| `phase:3`   | `#0e8a16` | Phase 3: Auth         |
| `phase:4`   | `#fbca04` | Phase 4: Mobile       |

### Workstream Labels (`workstream:*`)

| Label                | Color     | Description            |
| -------------------- | --------- | ---------------------- |
| `workstream:map`     | `#1d76db` | Map component          |
| `workstream:panel`   | `#5319e7` | Side panel             |
| `workstream:server`  | `#0e8a16` | tRPC/Express server    |
| `workstream:db`      | `#fbca04` | Drizzle/MySQL schema   |
| `workstream:infra`   | `#d93f0b` | CI/CD, Railway, deploy |
| `workstream:docs`    | `#0075ca` | Documentation          |
| `workstream:testing` | `#c5def5` | Test infrastructure    |

### Priority Labels (`priority:*`)

| Label             | Color     | Description     |
| ----------------- | --------- | --------------- |
| `priority:high`   | `#d73a4a` | High priority   |
| `priority:medium` | `#fbca04` | Medium priority |
| `priority:low`    | `#0e8a16` | Low priority    |

### Verification Labels (`verify:*`)

| Label       | Color     | Description                |
| ----------- | --------- | -------------------------- |
| `verify:v0` | `#fbca04` | Author self-verifies       |
| `verify:v1` | `#fbca04` | Peer verification required |
| `verify:v2` | `#fbca04` | Peer + extra evidence      |

### Agent Labels (`agent:*`)

| Label      | Color     | Description        |
| ---------- | --------- | ------------------ |
| `agent:se` | `#5319e7` | Assign to Local SE |
| `agent:tl` | `#5319e7` | Assign to TL       |
| `agent:pe` | `#5319e7` | Assign to PE       |

### Evidence Labels (`evidence:*`)

| Label                     | Color     | Description           |
| ------------------------- | --------- | --------------------- |
| `evidence:db-or-ci`       | `#0e8a16` | DB-backed tests or CI |
| `evidence:deployed-smoke` | `#0e8a16` | Deployed smoke test   |

### Special Labels

| Label              | Color     | Description               |
| ------------------ | --------- | ------------------------- |
| `epic`             | `#7057ff` | High-level epic           |
| `blocked`          | `#b60205` | Blocked on external input |
| `needs-refinement` | `#d876e3` | Issue needs more detail   |

## Labels to Remove (Deprecated)

These labels are from the old role-based model and should be removed:

- `role:builder`
- `role:explorer`
- `role:verifier`
- `role:browser`
- `build-map` (replace with `workstream:*` + `phase:*`)
- `codex` (unclear purpose)
- `status:ready` (use Project board Status instead)
- `status:triage` (use Project board Status instead)

## Label Commands

```bash
# Create new labels
gh label create "type:docs" --color "0075ca" --description "Documentation"
gh label create "type:test" --color "fbca04" --description "Testing"
gh label create "type:security" --color "b60205" --description "Security"
gh label create "type:spike" --color "c2e0c6" --description "Research"
gh label create "type:verification" --color "f9d0c4" --description "PR verification"
gh label create "complexity:0-2" --color "0e8a16" --description "Simple (Self or Local SE)"
gh label create "complexity:3-4" --color "fbca04" --description "Medium (SWE GPT-5.2-Codex)"
gh label create "complexity:5-6" --color "d93f0b" --description "Complex (SWE Opus)"
gh label create "workstream:map" --color "1d76db" --description "Map component"
gh label create "workstream:panel" --color "5319e7" --description "Side panel"
gh label create "workstream:server" --color "0e8a16" --description "tRPC/Express server"
gh label create "workstream:db" --color "fbca04" --description "Drizzle/MySQL schema"
gh label create "workstream:infra" --color "d93f0b" --description "CI/CD, Railway, deploy"
gh label create "workstream:docs" --color "0075ca" --description "Documentation"
gh label create "workstream:testing" --color "c5def5" --description "Test infrastructure"
gh label create "blocked" --color "b60205" --description "Blocked on external input"
gh label create "needs-refinement" --color "d876e3" --description "Issue needs more detail"

# Delete deprecated labels
gh label delete "role:builder" --yes
gh label delete "role:explorer" --yes
gh label delete "role:verifier" --yes
gh label delete "role:browser" --yes
gh label delete "codex" --yes
```
