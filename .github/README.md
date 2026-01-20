# Agent Prompt Files

This directory contains prompt files that define how AI agents should operate on the CMC Go project.

## File Purposes

### `builder.prompt.md`
Instructions for the **Builder Agent** — the primary execution engine that implements code changes.

**Key principles:**
- Execute continuously without pausing
- Commit frequently with small, verifiable changes
- Report progress through commits, not conversation
- Escalate only when genuinely blocked

**Use when:** An agent is implementing code changes, bug fixes, or features.

### `loop.prompt.md`
Reinforcement of the **continuous operation loop** for all agents.

**Key principles:**
- Assess → Decide → Execute → Verify → Continue (no interruptions)
- Never pause to ask "should I continue?"
- Token efficiency through action, not narration
- Escalate when blocked, never to confirm correctness

**Use when:** Agents need reminding about continuous autonomous operation.

### `cb.prompt.md`
Instructions for the **Coordinator/Browser Agent** — handles delegation and browser operations.

**Key principles:**
- Translate user intent into scoped tasks
- Delegate to specialized agents appropriately
- Verify outcomes through evidence
- Coordinate across agent boundaries

**Use when:** An agent is coordinating work, delegating tasks, or operating in a browser context.

## How to Use These Prompts

### For AI Agents
When you receive a task:
1. Read the relevant prompt file for your role
2. Align with `docs/authority/AGENT_GOVERNANCE.md`
3. Execute continuously according to the loop
4. Reference `docs/agents/BUILD_MAP.md` for phase priorities

### For Users
When delegating to agents:
- Reference the appropriate prompt file in your instructions
- Trust the agent to execute autonomously
- Review commits/PR, not mid-execution status
- Interrupt only when genuinely needed

## Governance Hierarchy

When conflicts arise between documents:

1. **The Coherence Engine** (`docs/authority/The Coherence Engine.md`)
   - Epistemic foundations
   - Highest authority on principles

2. **CMC_GO_BRIEF.md** (`docs/agents/CMC_GO_BRIEF.md`)
   - System invariants
   - Core mental model

3. **BUILD_MAP.md** (`docs/agents/BUILD_MAP.md`)
   - Current phase and tasks
   - Tactical priorities

4. **AGENT_GOVERNANCE.md** (`docs/authority/AGENT_GOVERNANCE.md`)
   - Token management
   - Communication protocols
   - Authority boundaries

5. **These prompt files**
   - Role-specific operational guidance
   - Implementation details

## Updating Prompt Files

**When to update:**
- Recurring operational issues
- New agent types introduced
- Phase transitions in BUILD_MAP.md
- Governance violations detected

**How to update:**
- Treat prompt files like code
- Small, focused changes
- Commit with clear rationale
- Verify through agent behavior

**Who can update:**
- Requires user approval (like governance changes)
- Updates versioned through Git
- Changes must align with Coherence Engine principles

## Token Efficiency

These prompt files exist to **reduce token waste** by:
- Eliminating need for mid-execution status updates
- Preventing repetitive permission requests
- Establishing clear escalation criteria
- Defining communication channels

**Good usage:**
- Agent reads prompt once, executes from memory
- User references prompt in delegation
- Both parties trust the documented process

**Poor usage:**
- Agent asks questions answered in prompts
- User micromanages steps already defined
- Repetitive narrative instead of commits

## Integration with Other Docs

These prompts are designed to work with:
- `AGENTS.md` — High-level agent role definition
- `copilot-instructions.md` — Technical implementation guide
- `BUILD_MAP.md` — Current phase and priorities
- `AGENT_GOVERNANCE.md` — Operational rules and protocols

## Quick Reference

| Agent Type | Prompt File | Primary Focus |
|------------|-------------|---------------|
| Builder/Developer | `builder.prompt.md` | Code implementation, continuous execution |
| Coordinator/Browser | `cb.prompt.md` | Task delegation, evidence verification |
| All Agents | `loop.prompt.md` | Continuous operation principles |

---

**Remember: These prompts enable autonomous operation. Trust the process, verify through evidence.**
