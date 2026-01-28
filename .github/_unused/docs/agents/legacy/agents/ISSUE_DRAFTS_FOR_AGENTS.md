# Issue Drafts — TL/SWE (Legacy)

Authority: `docs/agents/legacy/CMC_GO_COORDINATOR.md`

These are **copy/paste-ready** GitHub Issue drafts (titles + labels + bodies) aligned to the TL/SWE workflow.

---

## Tech Lead (TL): Turn goal into executable Issue

**Title:** TL: Spec + de-risk <short title>

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

## NOTES / RISKS:

---

## Software Engineer (SWE): Implement <short title>

**Title:** SWE: Implement <short title>

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

## Software Engineer (SWE): Peer verify PR <pr#> (L1/L2)

**Title:** SWE: Peer verify PR <pr#> — <short title>

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
