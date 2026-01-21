# Codespaces / Dev Container

This repo supports GitHub Codespaces via the devcontainer in this folder.

## What you get

- Node + pnpm (via corepack)
- MySQL 8 running as a sibling container (`db`)
- Environment variables pre-set for the server DB connector (`DATABASE_URL` and `MYSQL_*`)

## First-time usage

1) Open the repo in a Codespace.
2) Wait for `pnpm install` to finish.
3) Start dev:

- `pnpm dev`

If you need schema sync/seed:

- `pnpm db:push:yes`
- `pnpm db:seed`

## Notes

- The MySQL data is persisted in a named docker volume (`mysql-data`).
- Ports 5173/3000/3001 are forwarded automatically.
