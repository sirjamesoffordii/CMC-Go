---
name: Verify PR
mode: agent
description: Structured PR verification process for CMC Go.
tools:
  - read
  - execute
  - github
---

# Verify PR

Structured PR verification process for CMC Go.

## Pre-Verification

1. **Read the Issue/PR**
   - Understand the Goal
   - Note the Acceptance Criteria (AC)
   - Check the verification steps listed

2. **Check CI Status**
   - All checks passing?
   - If failing, note which ones

## Verification Steps

### 1. Code Review

- [ ] Changes are scoped to the Issue
- [ ] No unrelated changes mixed in
- [ ] Follows project patterns (check `.github/instructions/`)
- [ ] No hardcoded values that should be configurable

### 2. Invariants Check

- [ ] `districts.id` values unchanged (unless explicitly updating)
- [ ] `people.personId` semantics preserved
- [ ] Status enums use exact strings: `Yes`, `Maybe`, `No`, `Not Invited`

### 3. Run Tests

```bash
pnpm check       # Type check
pnpm test        # Unit/integration tests
pnpm e2e         # E2E tests (if applicable)
```

### 4. Manual Verification (if applicable)

- [ ] Start dev server: `pnpm dev`
- [ ] Test the specific functionality changed
- [ ] Check edge cases mentioned in AC

### 5. Security Considerations

- [ ] No secrets or credentials in code
- [ ] Authorization checks in place for protected routes
- [ ] Input validation on user-provided data

## Verdict

Post your verdict using this format:

```markdown
## Verification Verdict

**Result:** Pass | Pass-with-notes | Fail

**Evidence:**

- `pnpm check` - ✅
- `pnpm test` - ✅ (X tests passed)
- Manual test: [what you tested]

**Notes/Risks:**

- [Any concerns or observations]

**AC Checklist:**

- [x] AC 1 - verified by [how]
- [x] AC 2 - verified by [how]
```

## Verdict Meanings

| Verdict             | Meaning                       | Action                |
| ------------------- | ----------------------------- | --------------------- |
| **Pass**            | All AC met, no concerns       | Approve merge         |
| **Pass-with-notes** | AC met, minor concerns noted  | Approve with comments |
| **Fail**            | AC not met or blocking issues | Request changes       |
