# Agent Governance Rules — CMC Go

## Purpose

This document establishes governance rules for AI agents operating on CMC Go, ensuring:
- Efficient token usage
- Clear communication protocols
- Proper authority boundaries
- Continuous autonomous operation

## Token Storage & Management

### Token Budget Principles

1. **Context is expensive** — Read reference documents once, execute from memory
2. **Code over conversation** — Commits speak louder than status updates
3. **Evidence over narrative** — Show outputs, don't describe them
4. **Delegation over duplication** — Use specialized agents instead of repeating work

### Token Allocation Priorities

**High-value token use:**
- Reading system documentation (first time only)
- Implementing code changes
- Running tests and builds
- Generating diffs and commits
- Investigating failures with evidence

**Low-value token use:**
- Repeating information from docs
- Status updates between steps
- Asking permission to continue
- Narrating actions before taking them
- Conversational filler

### Token Storage Rules

**Forbidden:**
- ❌ Storing tokens as files in the repository
- ❌ Committing API keys or credentials
- ❌ Embedding auth tokens in code
- ❌ Leaving temporary token files in working directory

**Required:**
- ✅ Use environment variables for all tokens/secrets
- ✅ Reference `.env.example` for required variables
- ✅ Store credentials in Railway/deployment platform secrets
- ✅ Clean up any temporary files before committing

## Agent Communication Protocols

### Inter-Agent Communication

**When agents need to coordinate:**

1. **Use the system of record** (Git/PR comments)
   - Not: "I'll tell the other agent..."
   - Yes: Commit changes, next agent sees them

2. **Provide complete context** in delegation
   - Assume no shared memory across agents
   - Include relevant doc references
   - Define success criteria explicitly

3. **Verify through evidence** not through asking
   - Not: "Did the builder agent finish?"
   - Yes: Check CI status, review commits

### Agent-to-User Communication

**Progress reporting:**
- Primary: Git commits with clear messages
- Secondary: PR description updates
- Exceptional: Escalations when blocked

**Escalations must include:**
- What you attempted
- What evidence you gathered
- Why you cannot proceed
- What specific information is needed

**Do not escalate for:**
- Routine implementation decisions
- Permission to continue mid-task
- Confirmation of correctness (use CI)
- Status updates between logical steps

### User-to-Agent Communication

**Users should:**
- Provide clear, scoped tasks
- Reference BUILD_MAP.md phases
- Specify success criteria when non-obvious
- Trust agents to execute autonomously

**Users should not:**
- Micromanage step-by-step
- Ask for status between commits
- Request permission mid-execution
- Interrupt continuous workflows

## Authority Boundaries

### Agent Authority Levels

**Autonomous (no approval needed):**
- Code changes within assigned scope
- Running tests/builds/lints
- Committing and pushing changes
- Fixing failures the agent created
- Following BUILD_MAP.md priorities

**Requires User Approval:**
- Changing system invariants
- Modifying auth/security boundaries
- Deviating from assigned task scope
- Skipping BUILD_MAP.md phases
- Adding new dependencies (after security check)

**Forbidden Without Explicit Instruction:**
- Modifying production database directly
- Bypassing CI/security gates
- Removing tests to make builds pass
- Changing governance documents
- Altering agent prompt files

### Separation of Concerns

**Execution agents:**
- Generate diffs and implementations
- Run tests and builds
- Report evidence
- Do not self-certify correctness

**Judgment/Review agents:**
- Evaluate evidence
- Verify against invariants
- Gate state transitions
- Do not generate new code changes

## Continuous Operation Rules

### The Autonomy Contract

**Agents commit to:**
- Execute tasks without interruption
- Advance through logical sequences automatically
- Escalate only when genuinely blocked
- Report through commits, not conversation

**Users commit to:**
- Provide clear initial scope
- Trust autonomous execution
- Review evidence (commits/CI), not narratives
- Intervene only when gates fail

### When to Break Continuity

**Valid interruptions:**
- Invariant violation detected
- Security boundary unclear
- External dependency blocking
- Requirements genuinely ambiguous
- CI/tests failing persistently

**Invalid interruptions:**
- Asking if progress is correct
- Requesting permission mid-task
- Pausing for status updates
- Seeking approval between commits

## Governance Enforcement

### Verification Points

All agent work must pass through:

1. **Code Review** (human or automated)
   - Small diffs preferred
   - Evidence required
   - Invariants verified

2. **CI/CD Gates**
   - Must pass before merge
   - No bypass without documented reason
   - Flaky tests are bugs, not noise

3. **Deployment Verification**
   - Observability confirms behavior
   - Rollback available
   - Evidence preserved

### Violation Responses

**Token waste:**
- Reminder of efficiency rules
- Prompt file refinement
- Pattern analysis and correction

**Authority overreach:**
- Revert unauthorized changes
- Strengthen gates
- Clarify boundaries

**Communication protocol breach:**
- Redirect to proper channels
- Update agent prompts
- Document lesson learned

## Reference Hierarchy

When conflicts arise, priority order:

1. **The Coherence Engine** (epistemic foundations)
2. **CMC_GO_BRIEF.md** (system invariants)
3. **BUILD_MAP.md** (current phase priorities)
4. **AGENTS.md** (role definitions)
5. **This document** (operational rules)
6. **Prompt files** (agent-specific guidance)

## Document Maintenance

**This governance doc:**
- Updated only when operational patterns change
- Changes require user approval
- Versioned through Git like all code
- Referenced by all agent prompt files

**Review triggers:**
- Recurring governance violations
- New agent types introduced
- Platform/tooling changes
- BUILD_MAP.md phase transitions

---

**Final Rule: When in doubt, preserve system coherence over individual convenience.**
