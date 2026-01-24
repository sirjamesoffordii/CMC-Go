---
name: RAILWAY_COMMANDS
description: Railway CLI commands for debugging deployments, logs, and service status.
applyTo: "**"
---

# Railway Commands Reference for Agents

Quick commands agents can use to access Railway information for debugging.

## Prerequisites

Railway CLI must be authenticated. Check with:

```powershell
railway whoami
```

## View Deployment Logs

### Recent logs (last 100 lines):

```powershell
railway logs --limit 100
```

### Live/streaming logs:

```powershell
railway logs --follow
```

### Logs from specific deployment:

```powershell
railway logs --deployment <deployment-id>
```

## Check Service Status

### View current deployment status:

```powershell
railway status
```

### List all services in project:

```powershell
railway service list
```

## Environment Variables

### View environment variables (redacted):

```powershell
railway variables
```

## Deployment Info

### View recent deployments:

```powershell
railway deployments
```

## Common Troubleshooting Patterns

### Server won't start:

```powershell
railway logs --limit 50 | Select-String -Pattern "error|Error|ERROR|failed|Failed"
```

### Database connection issues:

```powershell
railway logs --limit 100 | Select-String -Pattern "database|mysql|connection|ECONNREFUSED"
```

### Check if service is healthy:

```powershell
railway status
railway logs --limit 20
```

## Links

- Railway Dashboard: https://railway.app/project/
- Railway Docs: https://docs.railway.com/
