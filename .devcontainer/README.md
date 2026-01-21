# Codespaces / Devcontainer

This repo supports GitHub Codespaces via a devcontainer.

## What you get

- Node + pnpm inside the `app` container
- MySQL 8 inside the `mysql` container
- Ports forwarded: `5173` (Vite), `3000` (server), `3306` (MySQL)

## First-time setup

The container runs `pnpm install` on create.

Suggested next steps inside the container:

- `pnpm dev`
- `pnpm db:push:yes` (sync schema to dev DB)

If you need Codespaces CLI access locally, ensure your `gh` token includes the `codespace` scope.
