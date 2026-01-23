---
name: CMC_GO_BRIEF
description: Product intent, technical shape, and hard invariants for CMC Go.
applyTo: "**"
---

# CMC Go Brief

> **Note:** The canonical product info is in the **CMC Go Project README**: https://github.com/users/sirjamesoffordii/projects/2
>
> This file exists for quick reference when the project board isn't accessible.

CMC Go is a **map-first coordination app** that helps leaders see, track, and mobilize people toward the Campus Missions Conference (CMC).

## What it does

- Shows readiness geographically (region → district → campus).
- Tracks a person’s attendance status and follow-up context (notes/needs).
- Makes gaps obvious: who is uninvited, uncertain, or needs follow-up.

## Product rules (don’t break)

- The system is a **single source of truth**: if it’s not in CMC Go, it’s not considered real.
- Status values are fixed: `Yes`, `Maybe`, `No`, `Not Invited`.
- Data integrity matters more than polish.

## Technical shape

- React client in `client/`.
- tRPC + Express server in `server/`.
- MySQL via Drizzle schema in `drizzle/`.

## Hard invariants

- `districts.id` must match `client/public/map.svg` `<path id="...">` values (case-sensitive).
- `people.personId` (varchar) is the cross-table/import key.

## Where to look next

- Operating policy: `AGENTS.md`
- `.github` navigation: `.github/README.md`
