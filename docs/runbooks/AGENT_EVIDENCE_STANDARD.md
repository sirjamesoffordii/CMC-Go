# Agent Evidence Standard (token-saving)

Goal: preserve confidence while keeping Issue/PR comments short.

## Default rules

- Prefer links over pasted content.
- Use **at most 10 relevant lines** of logs/output.
- Prefer file lists over full diffs:
  - `git diff --name-only <base>...<branch>`
  - `git diff --name-status <base>...<branch>`
- When posting test output, include only:
  - the command(s)
  - pass/fail summary
  - first failure location (if fail)

## Recommended “evidence blocks”

### Builder PR description
- **What changed:** 2-5 bullets
- **How verified:** commands + short result
- **Risk:** 1-2 lines

### Verifier PR comment
- **Result:** Pass / Fail / Pass-with-notes
- **Evidence:** commands run + short result
- **Notes/Risks:** brief

## Never do

- Don't paste secrets.
- Don't paste multi-page logs; link to CI/Railway/Sentry instead.
