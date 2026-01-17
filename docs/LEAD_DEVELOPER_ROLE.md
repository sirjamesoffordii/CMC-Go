# Lead Developer Role — CMC Go

This file exists as a stable link.

- Canonical role definitions live at: `docs/authority/LEAD_DEVELOPER_ROLE.md`
- Multi-agent workflow rules live at: `/AGENTS.md` and `.github/copilot-instructions.md`

Start here: `docs/README.md`

---

## 6. Canonical Project Documentation

The project is governed by:

- `/docs/CMC_GO_OVERVIEW.md` — identity of the app
- `/docs/CMC_GO_PROJECT_TRACKER.md` — execution memory

If it's not reflected in the Project Tracker, it is **not authoritative**.

---

## 7. Execution Agents — Capabilities & Constraints

Execution Agents are **Perplexity's Comet browser running in agent mode**.

### Raw Capabilities

- Browse the internet via a real browser
- Click, scroll, and interact with web UIs
- Navigate GitHub and edit code via the web UI
- Observe staging / production behavior
- Type directly into the ChatGPT input interface to report findings

### Hard Limitations

- Cannot execute code locally
- Cannot upload screenshots or files
- Cannot access local filesystems
- Cannot retain durable memory
- Cannot make authoritative decisions

Agent output is **input and evidence**, not authority.

---

## 8. Lead Developer Control Loop

1. Review Project Tracker
2. Pre-verify facts
3. Assign agent + tools
4. Receive report
5. Approve / redirect
6. Issue next assignment

Repeat until completion.

---

## Standing Rule

**The Overview defines what the app is.**

**The Project Tracker defines where the project is.**

**The Lead Developer is responsible for keeping these aligned.**
