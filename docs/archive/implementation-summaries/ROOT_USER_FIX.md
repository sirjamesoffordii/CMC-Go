# Root User Fix - Implementation Summary

## Problem

Local dev was failing with:
```
Access denied for user 'root'@'100.64.0.5' (using password: YES)
```

**Root cause:** Local proxy rewrite preserved credentials from `DATABASE_URL`. Jay's local `DATABASE_URL` used `root`, but `root` is not allowed via public proxy.

## Solution

Implemented automatic credential replacement for local dev when using public proxy:
- If `DATABASE_URL` uses `root` user with public proxy, automatically replace with `cmc_go`
- Requires `DEMO_DB_PASSWORD` environment variable
- Fails fast with clear error if `DEMO_DB_PASSWORD` is missing

## Files Changed

### 1. `server/_core/env.ts`

**Enhanced `getDatabaseUrl()` function:**

```typescript
// Automatic rewrite for local dev: Railway internal → public proxy + credential replacement
if (!isProduction) {
  const urlObj = new URL(url);
  let hostname = urlObj.hostname.toLowerCase();
  let isUsingProxy = hostname.includes('proxy.rlwy.net');
  
  // Rewrite host if needed
  if (hostname.includes('railway.internal') && !isUsingProxy) {
    urlObj.hostname = 'shortline.proxy.rlwy.net';
    urlObj.port = '56109';
    isUsingProxy = true;
    hostname = urlObj.hostname.toLowerCase();
  }
  
  // Enforce non-root user for public proxy
  const username = urlObj.username;
  if (isUsingProxy && username === 'root') {
    const demoUser = process.env.DEMO_DB_USER || 'cmc_go';
    const demoPassword = process.env.DEMO_DB_PASSWORD;
    
    if (!demoPassword) {
      throw new Error(
        'Local dev is configured to use root via proxy. Root is blocked. ' +
        'Set DEMO_DB_PASSWORD or update DATABASE_URL to use cmc_go user.'
      );
    }
    
    urlObj.username = demoUser;
    urlObj.password = demoPassword;
  }
  
  url = urlObj.toString();
  
  // Log connection details
  if (wasRewritten || isUsingProxy) {
    console.log(`[ENV] DB host: ${urlObj.hostname}`);
    console.log(`[ENV] Connection path: ${isUsingProxy ? 'PUBLIC PROXY' : 'INTERNAL'}`);
    console.log(`[ENV] DB user: ${urlObj.username}`);
  }
}
```

**Key changes:**
- Parse URL into components (user, pass, host, port, db)
- Check if using public proxy (either already `proxy.rlwy.net` OR rewritten from `railway.internal`)
- If username is `root` and using proxy, replace with `cmc_go`
- Use `DEMO_DB_USER` (default `"cmc_go"`) and `DEMO_DB_PASSWORD`
- Throw clear error if `DEMO_DB_PASSWORD` is missing
- Never rewrite credentials in production
- Log connection details (host, path, user - never password)

### 2. `docs/how-to/SHARED_DEMO_DB.md`

**Updated sections:**
- Added explicit requirement: Local via proxy must use `cmc_go`, not `root`
- Added recommended local env examples
- Added troubleshooting section for root user error
- Updated verification steps with new log format

## Environment Variables

### Required (when using root with proxy)
- `DEMO_DB_PASSWORD` - Password for `cmc_go` user (required when replacing root)

### Optional
- `DEMO_DB_USER` - Demo database user (defaults to `"cmc_go"`)

## Recommended .env for Jay

### Option 1: Direct cmc_go (Recommended)
```env
DATABASE_URL=mysql://cmc_go:<password>@shortline.proxy.rlwy.net:56109/railway
```

### Option 2: Internal host with auto-rewrite
```env
DATABASE_URL=mysql://cmc_go:<password>@mysql-uqki.railway.internal:3306/railway
# Automatically rewrites to public proxy
```

### Option 3: Root user with auto-replacement
```env
DATABASE_URL=mysql://root:<password>@shortline.proxy.rlwy.net:56109/railway
DEMO_DB_USER=cmc_go  # Optional: defaults to "cmc_go"
DEMO_DB_PASSWORD=<cmc_go_password>  # Required when replacing root
```

## Verification

### ✅ Success Case: cmc_go user

**Terminal output:**
```
[ENV] DB host: shortline.proxy.rlwy.net
[ENV] Connection path: PUBLIC PROXY
[ENV] DB user: cmc_go
[ENV] ⚠️  Connected to Railway staging demo DB (shared with staging website)
```

**Health endpoint:**
```json
{
  "ok": true,
  "dbHost": "shortline.proxy.rlwy.net",
  "connectionPath": "proxy",
  "isDemoDb": true
}
```

**App behavior:**
- App loads successfully
- `/api/health` returns `ok: true`
- No connection errors

### ❌ Failure Case: root user without DEMO_DB_PASSWORD

**Terminal output:**
```
Error: Local dev is configured to use root via proxy. Root is blocked. Set DEMO_DB_PASSWORD or update DATABASE_URL to use cmc_go user.
```

**App behavior:**
- App fails fast at startup
- Clear error message
- No Drizzle SELECT 1 spam

### ✅ Success Case: root user with DEMO_DB_PASSWORD

**Terminal output:**
```
[ENV] DB host: shortline.proxy.rlwy.net
[ENV] Connection path: PUBLIC PROXY
[ENV] DB user: cmc_go
[ENV] ⚠️  Connected to Railway staging demo DB (shared with staging website)
```

**App behavior:**
- App loads successfully
- Root user automatically replaced with cmc_go
- Connection succeeds

## Safety Guarantees

1. ✅ **Never rewrites in production** - Production uses `DATABASE_URL` exactly as provided
2. ✅ **Never rewrites if not using proxy** - Only applies to public proxy connections
3. ✅ **Never logs passwords** - Only logs username, host, connection path
4. ✅ **Fails fast** - Clear error message if `DEMO_DB_PASSWORD` is missing
5. ✅ **No production behavior changes** - All changes are dev-only

## Testing Checklist

- [x] Root user with proxy → fails fast with clear error (no DEMO_DB_PASSWORD)
- [x] Root user with proxy + DEMO_DB_PASSWORD → succeeds, uses cmc_go
- [x] cmc_go user with proxy → succeeds, no changes
- [x] Internal host with root → rewrites to proxy, replaces with cmc_go
- [x] Internal host with cmc_go → rewrites to proxy, keeps cmc_go
- [x] Production → no rewrites, uses DATABASE_URL as-is
- [x] Logging → shows host, path, user (never password)

## Summary

- **Problem:** Root user blocked via public proxy
- **Solution:** Automatic credential replacement for local dev
- **Result:** Local dev "just works" with proper credentials
- **Safety:** Production behavior unchanged, fails fast with clear errors
