# Skill: Verification (CMC Go)

Verification must be evidence-based.

## Minimum verification
- Typecheck/lint if applicable
- Unit tests if present
- Targeted manual smoke checks for UI flows

## Evidence format (Issue comment)
- Commands run
- Result summary
- If UI: what page/flow was checked

## Optional E2E (Playwright)
If Playwright is installed, use it for repeatable checks.

Suggested scripts:
- `pnpm e2e` — run tests
- `pnpm e2e:ui` — interactive UI runner

If Playwright is not installed, do not block; provide manual evidence.
