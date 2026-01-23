---
name: Debug Production
mode: agent
description: Systematic approach to debugging issues in production or staging environments.
tools:
  - read
  - search
  - web
  - execute
---

# Debug Production Issue

Systematic approach to debugging issues in production or staging environments.

## Step 1: Gather Evidence

### Check Logs

```bash
# Railway logs (if using Railway)
railway logs --service <service-name>

# Or check Sentry for errors
# Dashboard: https://sentry.io/
```

### Identify the Scope

- When did it start? (deployment? specific time?)
- Who/what is affected? (all users? specific district?)
- Can it be reproduced locally?

## Step 2: Reproduce Locally

```bash
pnpm dev
```

Try to reproduce the exact user flow that caused the issue.

If environment-specific:

- Check environment variables
- Check database state differences
- Check external service availability

## Step 3: Form Hypothesis

Based on evidence, what's the most likely cause?

| Symptom       | Likely Causes                                      |
| ------------- | -------------------------------------------------- |
| 500 errors    | Unhandled exception, DB connection, null reference |
| 404 errors    | Route changed, resource deleted, wrong URL         |
| Slow response | N+1 query, missing index, large payload            |
| Stale data    | Caching issue, replication lag                     |
| Auth failures | Token expired, scope mismatch, CORS                |

## Step 4: Minimal Fix

- Fix the root cause, not symptoms
- Keep the fix as small as possible
- Add error handling to prevent recurrence

## Step 5: Add Regression Test

Write a test that would have caught this issue:

```typescript
test("should handle [edge case that caused bug]", async () => {
  // Arrange - set up the problematic state
  // Act - trigger the bug condition
  // Assert - verify correct behavior
});
```

## Step 6: Verify Fix

```bash
pnpm check
pnpm test
pnpm e2e
```

Test locally, then in staging before production.

## Step 7: Post-Mortem (for significant issues)

Document in the Issue/PR:

- **What happened:** Brief description
- **Impact:** Who was affected, for how long
- **Root cause:** Why it happened
- **Fix:** What we did
- **Prevention:** How we'll avoid this in the future

## Evidence Template

```
- **Issue:** [description]
- **Root cause:** [what was wrong]
- **Fix:** [PR/commit link]
- **Regression test:** Added in [file]
- **Deployed to:** staging → production
- **Verified:** [how you confirmed fix]
```
