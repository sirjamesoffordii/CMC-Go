# Local Development Setup - Quick Start

## Recommended Setup (Option 1)

The simplest setup for local development is to use the `cmc_go` user directly with the public proxy.

### Step 1: Create `.env` file

Create a `.env` file in the project root with:

```env
DATABASE_URL=mysql://cmc_go:<your_password>@shortline.proxy.rlwy.net:56109/railway
```

Replace `<your_password>` with the actual password for the `cmc_go` user.

### Step 2: Start dev server

```bash
pnpm dev
```

### Step 3: Verify connection

Check terminal output for:

```
[ENV] DB host: shortline.proxy.rlwy.net
[ENV] Connection path: PUBLIC PROXY
[ENV] DB user: cmc_go
[ENV] ⚠️  Connected to Railway staging demo DB (shared with staging website)
```

You should also see a yellow banner in the browser:

```
⚠️ CONNECTED TO RAILWAY STAGING DEMO DB
Connection path: PUBLIC PROXY
```

## That's It!

With Option 1, you don't need any additional environment variables. The app will:

- Connect directly to the Railway staging demo DB via public proxy
- Use the `cmc_go` user (no credential replacement needed)
- Share the same database as the staging website

## Alternative Options

If you need to use a different setup, see [SHARED_DEMO_DB.md](./SHARED_DEMO_DB.md) for:

- Option 2: Internal host (auto-rewrites to proxy)
- Option 3: Root user (auto-replaced with cmc_go)

## Troubleshooting

If you see connection errors, check:

1. Password is correct in `DATABASE_URL`
2. Network can reach Railway (try `ping shortline.proxy.rlwy.net`)
3. You're using `cmc_go` user, not `root`

For more details, see [SHARED_DEMO_DB.md](./SHARED_DEMO_DB.md).
