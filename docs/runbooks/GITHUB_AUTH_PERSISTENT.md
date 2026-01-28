# Persistent GitHub Auth (Windows)

Goal: run repo automation (issue seeding, etc.) without re-pasting a token every session.

## Option A (recommended): GitHub CLI

This avoids handling PATs directly and persists auth in the OS credential store.

1. Install GitHub CLI (`gh`)
2. Authenticate:

- `gh auth login`

3. Use scripts that support `gh` mode:

- `powershell -NoProfile -File scripts/create-agent-issues.ps1 -Mode gh`

## Option B: DPAPI-encrypted token file (no secrets in repo)

This stores an encrypted token in your Windows profile so scripts can load it automatically.

1. Create a fine-grained PAT with **Issues: Read and Write** for this repo.
2. Save it once:

- `powershell -NoProfile -File scripts/setup-github-token.ps1`

3. Run automation without prompting:

- `powershell -NoProfile -File scripts/run-create-agent-issues-rest-saved.ps1`

To remove the saved token:

- `powershell -NoProfile -File scripts/clear-github-token.ps1`

### Security notes

- The file is stored at `%LOCALAPPDATA%\CMC-Go\github_token.dpapi`.
- DPAPI ties the ciphertext to your Windows user and machine.
- The token is never committed to git by these scripts.
