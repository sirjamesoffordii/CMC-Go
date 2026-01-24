# MCP Setup Guide for CMC Go Agent Workflow

This guide is for **Claude Code / VS Code Copilot agents**, not the CMC Go app. It documents MCP servers that help agents work more autonomously on this repo.

> **Context window warning:** keep **fewer than 10 MCP servers enabled** at a time to avoid shrinking the model context window and degrading agent performance.

## Where to configure MCP servers

Most agents read MCP servers from their client config. For Claude Code, add entries under `mcpServers` in `~/.claude.json`. For VS Code Copilot agent, use your MCP-compatible extension settings (same structure).

Reference: [_external/everything-claude-code/mcp-configs/mcp-servers.json](_external/everything-claude-code/mcp-configs/mcp-servers.json)

### Example base structure

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

---

## 1) @modelcontextprotocol/server-memory

**What it does**
- Persists lightweight session memory between agent runs.
- Useful for keeping ongoing decisions, preferences, or “local state” that helps agents stay consistent across sessions.

**Why it helps CMC Go agents**
- Remembers repo-specific invariants (e.g., “districts.id must match map.svg IDs”).
- Helps with continuity across multi-day tasks and repeated agent sessions.

**Install / configure**
- Run via `npx` (no local install required):

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

**Environment variables**
- None required.

**Example configuration snippet**

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

---

## 2) @railway/mcp-server

**What it does**
- Exposes Railway deployment/project status, logs, and deployment management to agents.

**Why it helps CMC Go agents**
- CMC Go uses Railway for deployments; agents can quickly check deploy status, logs, and recent releases without context switching.
- Supports faster debugging and verification after changes.

**Install / configure**

```json
{
  "mcpServers": {
    "railway": {
      "command": "npx",
      "args": ["-y", "@railway/mcp-server"]
    }
  }
}
```

**Environment variables**
- `RAILWAY_TOKEN` — Railway API token with read access to the project.

**Example configuration snippet**

```json
{
  "mcpServers": {
    "railway": {
      "command": "npx",
      "args": ["-y", "@railway/mcp-server"],
      "env": {
        "RAILWAY_TOKEN": "YOUR_RAILWAY_TOKEN"
      }
    }
  }
}
```

---

## 3) @modelcontextprotocol/server-sequential-thinking

**What it does**
- Provides a structured “sequential thinking” tool for multi-step reasoning and complex planning.

**Why it helps CMC Go agents**
- Good for multi-step debugging, incident analysis, or multi-file refactors (e.g., tracing auth/scoping logic across server + client).
- Helps agents explicitly plan steps before making changes.

**Install / configure**

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

**Environment variables**
- None required.

**Example configuration snippet**

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

---

## 4) context7/mcp-server

**What it does**
- Live documentation lookup across popular libraries and frameworks.

**Why it helps CMC Go agents**
- Faster API references for tRPC, Drizzle, React, Playwright, and other libraries used in CMC Go.
- Reduces context switching and lowers the risk of incorrect API usage.

**Install / configure**

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

**Environment variables**
- None required.

**Example configuration snippet**

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

---

## Recommended MCP profile for CMC Go agents

To stay under the context limit, use a minimal, high-impact set:

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "railway": {
      "command": "npx",
      "args": ["-y", "@railway/mcp-server"],
      "env": {
        "RAILWAY_TOKEN": "YOUR_RAILWAY_TOKEN"
      }
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

## Practical tips

- **Keep MCPs minimal:** enable only what you need for the current task.
- **Use per-project disables:** if your client supports `disabledMcpServers`, keep heavy MCPs off by default.
- **Avoid secrets in repo:** store tokens in local environment variables, not in repo files.

## Notes

- Config reference and descriptions are aligned with the example MCP list in [_external/everything-claude-code/mcp-configs/mcp-servers.json](_external/everything-claude-code/mcp-configs/mcp-servers.json).
- If a server fails to start, verify `npx` is available and that the package name is correct.
