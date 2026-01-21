# Skill: Verification (CMC Go)

Verification must be evidence-based.

## Verify levels

- **L0 (self)**: low-risk; self-verify with the smallest relevant evidence.
- **L1 (peer)**: another agent posts evidence + verdict.
- **L2 (deep)**: peer verification + deeper coverage (e2e/DB/console checks as relevant).

## Minimum verification
- `pnpm check`
- targeted `pnpm test`
- Targeted manual smoke checks for UI flows

## Evidence format (Issue comment)
- Commands run
- Result summary
- If UI: what page/flow was checked

## Optional E2E (Playwright)
If Playwright is installed, use it for repeatable checks.

Suggested scripts:
- `pnpm -s playwright test e2e/smoke.spec.ts` — targeted smoke
- `pnpm e2e` — run full suite

If Playwright is not installed, do not block; provide manual evidence.
