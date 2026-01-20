# CMC Go Documentation Navigation

## For AI Agents

### Start Here (Required Reading)
1. **[AGENTS.md](../AGENTS.md)** — Your role and authority definition
2. **[CMC_GO_BRIEF.md](agents/CMC_GO_BRIEF.md)** — System mental model and invariants
3. **[BUILD_MAP.md](agents/BUILD_MAP.md)** — Current phase and task tracking
4. **[AGENT_GOVERNANCE.md](authority/AGENT_GOVERNANCE.md)** — Governance rules and protocols

### Prompt Files (Operational Guidance)
- **[.github/loop.prompt.md](../.github/loop.prompt.md)** — Continuous execution loop
- **[.github/builder.prompt.md](../.github/builder.prompt.md)** — Builder agent instructions
- **[.github/cb.prompt.md](../.github/cb.prompt.md)** — Coordinator/browser agent guide
- **[.github/README.md](../.github/README.md)** — Prompt system overview

### Technical Implementation
- **[.github/copilot-instructions.md](../.github/copilot-instructions.md)** — Code patterns and practices
- **[runbooks/](runbooks/)** — Database, deployment, and development guides

### Governance & Principles
- **[authority/The Coherence Engine.md](authority/The Coherence Engine.md)** — Epistemic foundations
- **[authority/CMC_OVERVIEW.md](authority/CMC_OVERVIEW.md)** — Project philosophy

## For Humans

### Getting Started
- **[runbooks/LOCAL_SETUP.md](runbooks/LOCAL_SETUP.md)** — Local development setup
- **[runbooks/DEV_SETUP.md](runbooks/DEV_SETUP.md)** — Development workflow

### Database
- **[runbooks/DB_SETUP_VERIFICATION.md](runbooks/DB_SETUP_VERIFICATION.md)** — DB setup verification
- **[runbooks/MIGRATION_GUIDE.md](runbooks/MIGRATION_GUIDE.md)** — Schema migration guide
- **[runbooks/DB_RESET_GUIDE.md](runbooks/DB_RESET_GUIDE.md)** — Reset procedures

### Project Status
- **[CMC_GO_PROJECT_TRACKER.md](CMC_GO_PROJECT_TRACKER.md)** — Project tracking
- **[agents/BUILD_MAP.md](agents/BUILD_MAP.md)** — Build phases and progress
- **[project/WORK_QUEUE.md](project/WORK_QUEUE.md)** — Current work queue

### Architecture & Design
- **[CMC_GO_OVERVIEW.md](CMC_GO_OVERVIEW.md)** — System overview
- **[authority/CMC_OVERVIEW.md](authority/CMC_OVERVIEW.md)** — Core principles
- **[design/](design/)** — Design files

## Directory Structure

```
docs/
├── agents/               # AI agent mental models
│   ├── BUILD_MAP.md     # Current phase & tasks
│   └── CMC_GO_BRIEF.md  # System invariants
├── authority/           # Governance & principles
│   ├── AGENT_GOVERNANCE.md     # Agent rules
│   ├── CMC_OVERVIEW.md         # Project philosophy
│   └── The Coherence Engine.md # Epistemic foundations
├── project/             # Project management
│   ├── WORK_QUEUE.md   # Active work
│   └── STAGING_READY.md # Deployment status
├── runbooks/            # Operational guides
│   ├── LOCAL_SETUP.md  # Dev environment
│   ├── MIGRATION_GUIDE.md # DB migrations
│   └── DB_RESET_GUIDE.md  # Reset procedures
├── reference/           # Historical context
│   └── *_SUMMARY.md    # Implementation summaries
└── archive/             # Deprecated docs
    └── cmc-go-updates/ # Legacy updates
```

## Document Hierarchy (Authority Order)

When documents conflict, follow this priority:

1. **The Coherence Engine** — Epistemic foundations (highest authority)
2. **agents/CMC_GO_BRIEF.md** — System invariants
3. **agents/BUILD_MAP.md** — Current phase priorities
4. **authority/AGENT_GOVERNANCE.md** — Operational rules
5. **Prompt files** (.github/*.prompt.md) — Role-specific guidance
6. **Runbooks** (runbooks/*.md) — Procedural instructions

## Finding What You Need

### "How do I set up my dev environment?"
→ [runbooks/LOCAL_SETUP.md](runbooks/LOCAL_SETUP.md)

### "What phase are we in? What should I work on?"
→ [agents/BUILD_MAP.md](agents/BUILD_MAP.md)

### "What are the system invariants?"
→ [agents/CMC_GO_BRIEF.md](agents/CMC_GO_BRIEF.md)

### "How should I operate as an AI agent?"
→ [AGENTS.md](../AGENTS.md) → [authority/AGENT_GOVERNANCE.md](authority/AGENT_GOVERNANCE.md)

### "How do I handle database migrations?"
→ [runbooks/MIGRATION_GUIDE.md](runbooks/MIGRATION_GUIDE.md)

### "What are the governance principles?"
→ [authority/The Coherence Engine.md](authority/The Coherence Engine.md)

## Updates & Maintenance

### When to Update Documentation

**Required:**
- System invariants change
- Build phases advance
- New governance rules established
- Database schema changes

**Optional:**
- Reference summaries for completed work
- Improved clarity in existing docs
- Additional examples in runbooks

### How to Update

1. Treat documentation like code
2. Small, focused changes
3. Commit with clear rationale
4. Reference BUILD_MAP.md phase when relevant

---

**Quick Start for AI Agents:** Read AGENTS.md → CMC_GO_BRIEF.md → BUILD_MAP.md → Start executing.
