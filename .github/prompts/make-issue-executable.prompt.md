---
name: Make Issue Executable
description: TL pre-flight checklist to transform a vague issue into an agent-ready task
---

# Make Issue Executable

Use this prompt before assigning any issue to an agent (local or GitHub-hosted Copilot).

## The Problem

Issues like "Build Map: Phase 2 -- Default district panel (South Texas)" fail because:

- **No behavioral spec** — What does "default" mean? On first visit? For logged-out users?
- **No file pointers** — Agent must search entire codebase
- **Generic acceptance criteria** — Same checkboxes on every issue
- **Dead references** — "See BUILD_MAP" but BUILD_MAP is archived

## The Fix: 5-Point Executable Issue Checklist

Before handoff, ensure the issue has:

### 1. Goal (one sentence)

- ❌ "Implement default district panel"
- ✅ "When app loads with no district selected, automatically show South Texas district panel"

### 2. Behavioral Spec (trigger → before → after)

```markdown
- **Trigger:** App loads at `/` with no `?district=` param
- **Before:** Panel shows empty/placeholder or nothing selected
- **After:** Panel shows South Texas (`south-texas`) district content
- **Edge case:** If URL has `?district=xyz`, that takes precedence
```

### 3. Surface Area (files + patterns)

```markdown
Files likely to change:

- `client/src/pages/Home.tsx` — district selection logic
- `client/src/components/DistrictPanel.tsx` — may need default handling

Pattern to follow:

- See `selectedDistrictId` state in Home.tsx
- Follow existing URL param handling

Existing tests:

- `server/*.test.ts` — server tests (56 total)
- No client unit tests currently; E2E smoke covers basic flows
```

### 4. Constraints (don't break)

```markdown
- Existing URL param behavior (`?district=xyz`) must still work
- Map click → panel sync must still work
- `pnpm check` must pass
- `pnpm test` must pass (56 tests)
```

### 5. Verification (exact commands + manual steps)

````markdown
## Verification

```bash
pnpm check && pnpm test
```
````

Manual (if UI changed):

1. `pnpm dev` → open localhost:5173 (no params)
2. Observe: South Texas panel content visible
3. Click different district on map
4. Observe: Panel updates to clicked district
5. Navigate to `/?district=north-texas`
6. Observe: North Texas panel loads (not South Texas)

````

## Quick Reference: CMC Go Surface Area

### Client structure

| Area | Key files |
|------|-----------|
| Pages | `client/src/pages/Home.tsx`, `People.tsx`, `FollowUpView.tsx` |
| Components | `client/src/components/DistrictPanel.tsx`, `Map.tsx`, `InteractiveMap.tsx` |
| State | `selectedDistrictId` in Home.tsx, URL params |
| Hooks | `client/src/hooks/useIsMobile.ts`, `usePersistFn.ts` |

### Server structure

| Area | Key files |
|------|-----------|
| API routers | `server/routers.ts` |
| Auth | `server/_core/authorization.ts`, `server/_core/auth.ts` |
| DB | `server/db.ts`, `drizzle/schema.ts` |
| Tests | `server/*.test.ts` (10 test files, 56 tests) |

### Invariants (never break)

- `districts.id` must match `client/public/map.svg` `<path id="...">` (case-sensitive)
- `people.personId` is the cross-table key
- Status enums: `Yes`, `Maybe`, `No`, `Not Invited`

## Template: Paste into Issue

```markdown
## Goal

[One sentence describing the user-visible or system behavior change]

## Behavioral Spec

- **Trigger:** [What causes this behavior]
- **Before:** [Current behavior]
- **After:** [Expected behavior]
- **Edge cases:** [What takes precedence, error states]

## Surface Area

Files likely to change:
- `path/to/file.tsx` — [what changes]
- `path/to/other.ts` — [what changes]

Pattern to follow:
- [Reference to similar existing code]

Existing tests to extend:
- `server/foo.test.ts` — [add case for X]

## Constraints

- [Existing behavior X must continue working]
- `pnpm check` must pass
- `pnpm test` must pass

## Acceptance Criteria

- [ ] [Specific observable outcome 1]
- [ ] [Specific observable outcome 2]
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes

## Verification

```bash
pnpm check && pnpm test
````

Manual:

1. [Step]
2. [Observe]

```

## When to Skip This

- **Docs-only changes** — Just need Goal + What changed
- **Bug fixes with repro steps** — Repro steps serve as behavioral spec
- **Ops tasks** — Use ops_task template instead

## Output

After running this checklist, the issue should be ready for:

- `agent:copilot-swe` label (GitHub-hosted agent)
- SWE handoff (local agent)

## Projects v2 Checklist (critical for visibility)

**The operator sees status via the project board, not chat.**

Before handoff, ensure in Projects v2 (https://github.com/users/sirjamesoffordii/projects/4):

1. Issue is added to the project
2. Set **Status** → Todo (or In Progress if you're starting now)
3. Set **Phase** → correct milestone
4. Set **Workstream** → Map/Panel/Server/etc.
5. Set **Verify Level** → L0/L1/L2
6. Set **Item Type** → Task
7. **Assign** yourself if claiming

### Project Status Flow

```

Todo → In Progress → Verify → Done
↓
Blocked (with A/B/C decision in Issue)

````

### Quick Project Commands

```bash
# Add issue to project
gh project item-add 2 --owner sirjamesoffordii --url https://github.com/sirjamesoffordii/CMC-Go/issues/XXX

# List items to find item ID
gh project item-list 2 --owner sirjamesoffordii --format json | jq '.items[] | select(.content.number == XXX)'
````
