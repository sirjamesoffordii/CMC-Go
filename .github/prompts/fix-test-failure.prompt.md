---
name: Fix Test Failure
mode: agent
description: Systematic approach to diagnosing and fixing test failures.
tools:
  - read
  - edit
  - execute
  - test
---

# Fix Test Failure

Systematic approach to diagnosing and fixing test failures.

## Step 1: Understand the Failure

```bash
pnpm test -- --reporter=verbose
```

Look for:

- Which test file/suite failed?
- What was expected vs actual?
- Is it a timeout, assertion, or error?

## Step 2: Categorize the Failure

| Type          | Symptoms           | Likely Cause                              |
| ------------- | ------------------ | ----------------------------------------- |
| **Assertion** | Expected X, got Y  | Logic bug or spec changed                 |
| **Timeout**   | Test timed out     | Async issue, missing await, infinite loop |
| **Error**     | Uncaught exception | Runtime error, missing mock               |
| **Flaky**     | Passes sometimes   | Race condition, external dependency       |

## Step 3: Isolate

Run just the failing test:

```bash
pnpm test -- --grep "test name"
```

Run in watch mode for fast iteration:

```bash
pnpm test -- --watch
```

## Step 4: Debug

### For assertion failures:

- Check if the implementation changed
- Check if the test expectation is outdated
- Add `console.log` or use debugger

### For timeout failures:

- Check for missing `await` on async calls
- Check for unresolved promises
- Increase timeout temporarily to diagnose

### For mock issues:

- Verify mock setup matches current API
- Check mock is reset between tests

## Step 5: Fix

- Prefer fixing implementation over changing test expectations
- If spec changed, update both implementation AND test
- Add regression test if this was a bug

## Step 6: Verify

```bash
pnpm test        # All tests pass
pnpm check       # Type check passes
```

## Evidence Template

```
- **Failed test:** `describe > test name`
- **Root cause:** [what was wrong]
- **Fix:** [what you changed]
- **Verification:** `pnpm test` - ✅ all pass
```
