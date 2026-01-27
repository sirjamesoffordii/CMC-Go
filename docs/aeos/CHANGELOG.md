# AEOS Changelog

2026-01-27: Added session recovery checklist to TROUBLESHOOTING.md (auth, sync, orphan scan, board poll)
2026-01-27: Added orphaned SE work recovery protocol to TROUBLESHOOTING.md
2026-01-27: Added schema/migration drift troubleshooting section
2026-01-27: Added "One Issue Per PR" rule to SPAWN_PROCEDURES.md
2026-01-27: Added SE spawn reliability protocol (claim/branch/PR timeouts) to SPAWN_PROCEDURES.md
2026-01-27: Added MCP Memory cleanup protocol (24h heartbeat prune, duplicate merge)
2026-01-27: Added entity naming standards: canonical format is {Role}-{Instance} (e.g., TL-1, SE-3)
2026-01-27: Clarified GitHub is truth, MCP Memory is context cache (except Patterns/WorkflowChanges)
2026-01-27: Spawn prompt MUST end with: "FULLY AUTONOMOUS - NO QUESTIONS. Loop forever. Start now."
2026-01-27: ID format uses dash: TL-1(1), SE-1(2), PE-1(1) (not TL1)
2026-01-27: MCP Memory empty - agents NOT posting heartbeats (needs fix)
2026-01-27: Fixed spawn -m flag: use filename stem ("tech-lead") not name field ("Tech Lead")
2026-01-27: Simplified spawn ID to Role#(Gen#) e.g. TL1(1), SE1(2) - gen# tracks respawns
2026-01-27: Spawn message = "You are ID(Gen). Activate." - role files handle the rest
2026-01-27: Spawn mode names must be lowercase: "tech-lead", "software-engineer" (not capitalized)
2026-01-27: TL must NOT use runSubagent - spawn SE via `code chat -r -m "software-engineer"` instead
2026-01-27: Rewrote TL/SE agent files - compact (~70 lines), autonomous, NO QUESTIONS, loop-forever
2026-01-27: PE must use `code chat -r -m "Tech Lead"` to spawn TL (not runSubagent - that's blocking)
2026-01-27: Removed cloud agent workflows/scripts (no MCP Memory = drift)
2026-01-27: Added git-grep.ps1 for safe file search (avoids recursion hangs)
2026-01-27: Created CHANGELOG.md for AEOS hardening tracking
