# AEOS Changelog

2026-01-27: Simplified spawn ID to Role#(Gen#) e.g. TL1(1), SE1(2) - gen# tracks respawns
2026-01-27: Spawn message = "You are ID(Gen). Activate." - role files handle the rest
2026-01-27: Spawn mode names must be lowercase: "tech-lead", "software-engineer" (not capitalized)
2026-01-27: TL must NOT use runSubagent - spawn SE via `code chat -r -m "software-engineer"` instead
2026-01-27: Rewrote TL/SE agent files - compact (~70 lines), autonomous, NO QUESTIONS, loop-forever
2026-01-27: PE must use `code chat -r -m "Tech Lead"` to spawn TL (not runSubagent - that's blocking)
2026-01-27: Removed cloud agent workflows/scripts (no MCP Memory = drift)
2026-01-27: Added git-grep.ps1 for safe file search (avoids recursion hangs)
2026-01-27: Created CHANGELOG.md for AEOS hardening tracking
