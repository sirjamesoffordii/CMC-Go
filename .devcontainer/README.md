# Codespaces / Dev Container

This repo supports GitHub Codespaces via the devcontainer in this folder.

It also works for local development on Windows/macOS/Linux as long as you have a Docker engine available.

## What you get

- Node + pnpm (via corepack)
- MySQL 8 running as a sibling container (`db`)
- Environment variables pre-set for the server DB connector (`DATABASE_URL` and `MYSQL_*`)

## First-time usage

1) Open the repo in a Codespace.
2) Wait for `pnpm install` to finish.
3) Start dev:

- `pnpm dev`

- `pnpm dev`

## Local (Windows) — Dev Containers setup

Prereqs:

1) Install Docker Desktop for Windows.
2) Ensure WSL2 is installed (a distro like Ubuntu is fine).
3) In Docker Desktop Settings:
	- Enable **Use the WSL 2 based engine**
	- Enable **WSL integration** for your distro (e.g. `Ubuntu-24.04`)

Quick verification (PowerShell):

- `wsl -l -v`
- `docker version`
- `docker run --rm hello-world`

Then in VS Code:

1) Install the **Dev Containers** extension (`ms-vscode-remote.remote-containers`).
2) Command Palette → **Dev Containers: Reopen in Container**.

If you see prompts like “WSL not found”, it usually means Docker Desktop is not installed/running or WSL integration is not enabled for your distro.

If you need schema sync/seed:

- `pnpm db:push:yes`
- `pnpm db:seed`

## Notes

- The MySQL data is persisted in a named docker volume (`mysql-data`).
- Ports 5173/3000/3001 are forwarded automatically.
