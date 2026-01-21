# Issue Drafts — Universal Agents (Alpha/Bravo)

Authority: `docs/authority/CMC_GO_COORDINATOR.md`

These are **copy/paste-ready** GitHub Issue drafts (titles + labels + bodies) aligned to the universal agent model.

---

## Alpha: Turn goal into executable Issue

**Title:** Alpha: Spec + de-risk <short title>

**Labels:** `status:ready`

**Body:**

STATUS: Todo

GOAL:
- <one sentence>

SCOPE:
- In:
- Out:

ACCEPTANCE CRITERIA:
- [ ]

FILES LIKELY TO CHANGE:
- <paths>

VERIFICATION:
- `pnpm check`
- `pnpm test -w <target>` (or specify the smallest relevant command)

NOTES / RISKS:
-

---

## Bravo: Implement <short title>

**Title:** Bravo: Implement <short title>

**Labels:** `status:ready`

**Body:**

STATUS: Todo

GOAL:
- <one sentence>

ACCEPTANCE CRITERIA:
- [ ]

VERIFY LEVEL:
- L0 (self) | L1 (peer) | L2 (deep)

VERIFICATION (evidence required):
- `pnpm check`
- targeted `pnpm test`
- If UI flow changed: `pnpm -s playwright test e2e/smoke.spec.ts`

PR NOTES:
- Keep the diff small; avoid unrelated refactors.
- Link this Issue in the PR description.

---

## Bravo: Peer verify PR <pr#> (L1/L2)

**Title:** Bravo: Peer verify PR <pr#> — <short title>

**Labels:** `status:verify`

**Body:**

STATUS: Verify

CHANGE TO VERIFY:
- <PR link>

EXPECTED BEHAVIOR:
- <what should be true>

COMMANDS TO RUN:
- `pnpm check`
- `pnpm test`
- Add focused e2e if relevant

OUTPUT (comment on PR):
- Evidence (commands + key output)
- Verdict: Pass / Pass-with-notes / Fail

