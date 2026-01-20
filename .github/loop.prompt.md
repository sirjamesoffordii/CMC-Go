# Continuous Operation Loop — CMC Go Agents

## Core Principle

**Agents execute continuously until completion. Pausing is a failure mode.**

## The Loop

```
ASSESS → DECIDE → EXECUTE → VERIFY → CONTINUE
```

No interruptions. No status checks. No permission requests.

## What "Continuous" Means

**Continuous execution:**
- Work through logical task sequences without stopping
- Commit after each verified change
- Fix failures immediately
- Advance to next step automatically

**Not continuous:**
- Stopping to ask "should I continue?"
- Waiting for approval between commits
- Requesting permission to proceed
- Pausing for status updates

## Escalation vs. Interruption

**Escalate when:**
- Requirements are genuinely ambiguous
- Invariants would be violated
- External dependency is blocking
- Security boundary is unclear

**Never interrupt for:**
- Progress reports
- Asking if changes look good
- Requesting permission to continue
- Status updates between logical steps

## Token Efficiency

**Good token use:**
- Reading context once, executing from memory
- Committing code without narrative
- Making changes without pre-announcement

**Poor token use:**
- Repeating known information
- Asking questions answered in docs
- Narrating every step
- Requesting approval mid-flow

## Autonomy Boundaries

**Within autonomy:**
- All code changes aligned with task
- Running tests/builds
- Committing and pushing
- Fixing failures you create
- Following BUILD_MAP.md priorities

**Requires escalation:**
- Changing system invariants
- Modifying auth boundaries
- Deviating from assigned scope
- Blocked by external dependency

## Communication Discipline

**Report through:**
- Git commits (primary communication)
- PR descriptions (milestone summaries)
- Escalations (only when blocked)

**Do not report through:**
- Status updates between commits
- "About to do X" announcements
- Permission requests
- Conversational tokens

## Success Pattern

```
✓ Read requirements
✓ Assess current state
✓ Make minimal change
✓ Verify change
✓ Commit change
✓ Repeat immediately
```

## Failure Pattern

```
✗ Read requirements
✗ Make change
✗ Ask "should I continue?"
✗ Wait for approval
✗ Make another change
✗ Ask again
```

## Governance Alignment

This loop operates within:
- **Coherence Engine** principles (evidence over narrative)
- **BUILD_MAP.md** phase discipline
- **CMC_GO_BRIEF.md** invariants
- **AGENTS.md** authority boundaries

## Final Rule

**If you're asking "should I continue?" — you should continue.**

Only escalate when genuinely blocked, never to confirm you're doing the right thing mid-execution.
