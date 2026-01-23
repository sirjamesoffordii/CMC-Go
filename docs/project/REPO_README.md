# CMC Go

A map-first coordination app that helps leaders see who has been invited, where people are in their decision journey, who is going, and where support is needed — in order to build shared momentum toward going to CMC.

## Documentation

- [CMC Go Overview](/docs/authority/CMC_OVERVIEW.md) - Project identity and mental model
- [CMC Go Coordinator](/docs/authority/CMC_GO_COORDINATOR.md) - Coordination and truth-enforcement role
- Human authority (Sir James): source of product intent
- [The Coherence Engine](/docs/authority/The%20Coherence%20Engine.md) - System doctrine for truth and evidence
- [CMC Go Project Tracker](/docs/CMC_GO_PROJECT_TRACKER.md) - Development progress and milestones

## Overview

CMC Go provides an interactive SVG-based district map interface for tracking event invitations and attendee status across multiple districts, campuses, and individuals. The application features real-time status updates, notes and needs tracking, and comprehensive follow-up tools.

## Key Features

### Interactive Map Interface

- **SVG-based district visualization** using the plain Chi Alpha districts map
- **Hover effects** with visual feedback on district selection
- **Click-to-select** functionality for exploring district details
- **Push-layout side panel** that slides out to show district information without overlaying the map

### District & Campus Management

- **District-level view** with summary metrics (invited count, going count)
- **Campus columns** displaying all people organized by campus
- **Person rows** with visual status indicators and role information

### Status Tracking

- **Four-state status cycle**: Not invited yet → Maybe → Going → Not Going
- **Click-to-cycle** status bar on each person row
- **Optimistic updates** for instant UI feedback
- **Automatic lastUpdated** timestamp on all status changes

### Notes & Needs Management

- **Notes system** with leader-only flag option
- **Needs tracking** with Financial/Other type selection
- **Amount field** for financial needs (stored in cents)
- **Resolve/activate toggle** for managing active needs
- **Visual indicators** on person rows when notes or needs exist

### Follow-Up Page

- **Filtered view** showing people with "Maybe" status or active needs
- **Comprehensive table** with person, campus, district, status, last updated, and active needs columns
- **Click-to-view details** for quick access to person information

### Header Metrics

- **% Invited** calculation (invited / total people)
- **Going count** display
- **Countdown to CMC** (configurable date)
- **Quick navigation** to Follow-Up page

## Technical Architecture

### Data Model

The application uses **DistrictSlug as the source of truth** for district identification. This slug must match exactly across:

1. SVG path `id` attributes
2. Database `districts.id` field
3. All related foreign keys

#### Tables

**Districts**

- `id` (varchar) - DistrictSlug, primary key
- `name` (varchar) - Display name
- `region` (varchar) - Region name

**Campuses**

- `id` (int) - Auto-increment primary key
- `name` (varchar) - Campus name
- `districtId` (varchar) - Foreign key to districts

**People**

- `id` (int) - Auto-increment primary key
- `name` (varchar) - Person name
- `campusId` (int) - Foreign key to campuses
- `districtId` (varchar) - Foreign key to districts
- `status` (enum) - Not invited yet | Maybe | Going | Not Going
- `role` (varchar) - Optional role
- `lastUpdated` (timestamp) - Auto-updated on changes

**Needs**

- `id` (int) - Auto-increment primary key
- `personId` (int) - Foreign key to people
- `type` (enum) - Financial | Other
- `amount` (int) - Amount in cents (for Financial needs)
- `notes` (text) - Optional notes
- `isActive` (boolean) - Active/resolved status

**Notes**

- `id` (int) - Auto-increment primary key
- `personId` (int) - Foreign key to people
- `text` (text) - Note content
- `isLeaderOnly` (boolean) - Visibility flag
- `createdAt` (timestamp) - Creation timestamp

### SVG Map Integration

The interactive map is built using the plain SVG file located at:

```
client/public/map.svg
```

**How SVG IDs map to DistrictSlug:**

1. Each district in the SVG is represented by a `<path>` element
2. The `id` attribute of each path must exactly match the `DistrictSlug` in the database
3. Example: `<path id="Colorado" ...>` maps to district with `id="Colorado"`
4. The mapping is **case-sensitive** and must match exactly

**Updating the map:**

1. Replace `client/public/map.svg` with your updated SVG file
2. Ensure all path elements have `id` attributes
3. Verify `id` values match existing `DistrictSlug` values in the database
4. If adding new districts, insert corresponding records in the `districts` table

### Backend (tRPC)

All API endpoints are defined as tRPC procedures in `server/routers.ts`:

- `districts.list` - Get all districts
- `districts.getById` - Get district by ID
- `campuses.list` - Get all campuses
- `campuses.byDistrict` - Get campuses for a district
- `people.list` - Get all people
- `people.byDistrict` - Get people for a district
- `people.byCampus` - Get people for a campus
- `people.create` - Create new person
- `people.updateStatus` - Update person status
- `needs.byPerson` - Get needs for a person
- `needs.create` - Create new need
- `needs.toggleActive` - Toggle need active status
- `notes.byPerson` - Get notes for a person
- `notes.create` - Create new note
- `metrics.get` - Get global metrics
- `followUp.list` - Get follow-up people

### Frontend (React + Tailwind)

**Key Components:**

- `InteractiveMap` - SVG map with district selection
- `DistrictPanel` - Slide-out panel with district details
- `CampusColumn` - Campus view with person list
- `PersonRow` - Individual person with status cycling
- `PersonDetailsDialog` - Modal for notes and needs management

**Pages:**

- `Home` - Main map interface
- `FollowUp` - Follow-up table view

## Data Management

### Seeding Data

The application includes seed data from the provided Excel file. To re-seed:

```bash
# Generate JSON seed files from Excel
python3.11 scripts/prepare-seed-data.py

# Populate database
node scripts/seed-db.mjs
```

### Updating Data Safely

**Adding Districts:**

1. Add district to `districts` table with correct `DistrictSlug`
2. Ensure SVG map has matching `<path id="DistrictSlug">`
3. Add campuses with `districtId` matching the slug

**Adding People:**

1. Use the quick-add input in campus columns, or
2. Insert via database with correct `campusId` and `districtId`
3. Default status is "Not invited yet"

**Modifying Status:**

1. Click the status bar on any person row to cycle through statuses
2. Status updates are optimistic and update immediately
3. `lastUpdated` timestamp is automatically set

## Development

### Local Development

To run this project locally (Cursor or any IDE), set up environment variables.

1. **Create a `.env` file** in the project root (start from `.env.example`).

```env
# Database
DATABASE_URL=mysql://user:password@host:port/database

# Optional convenience for local dev (see server/_core/env.ts)
# STAGING_DATABASE_URL=mysql://...
# DEMO_DB_USER=cmc_go
# DEMO_DB_PASSWORD=...
# DEMO_DB_ALLOW_ROOT=false

# Sentry (optional)
SENTRY_DSN=
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=SirCursor

# Optional: OAuth / external services (only if you use those features)
JWT_SECRET=
VITE_APP_ID=
OAUTH_SERVER_URL=https://oauth.example.com
VITE_OAUTH_PORTAL_URL=https://oauth.example.com/portal
BUILT_IN_FORGE_API_URL=https://forge.example.com
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=https://forge.example.com
VITE_FRONTEND_FORGE_API_KEY=
```

2. **Install and run:**

```bash
# Install dependencies
pnpm install

# Push database schema (if needed)
pnpm db:push

# Seed database (if starting fresh)
node scripts/seed-db.mjs

# Start development server
pnpm dev
```

4. **Open in browser:** Navigate to `http://localhost:3000`

### Quick Setup (Existing Data)

If the database is already seeded:

```bash
pnpm install
pnpm dev
```

### Testing

```bash
# Run all tests
pnpm test
```

Tests cover:

- District, campus, and people queries
- Status updates with optimistic UI
- Metrics calculations
- Follow-up filtering

### Building

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Configuration

### CMC Date

The countdown is configured in `client/src/pages/Home.tsx`:

```typescript
const cmcDate = new Date("2026-06-01");
```

Update this date to change the countdown target.

### Status Colors

Status colors are defined in `client/src/components/PersonRow.tsx`:

```typescript
const STATUS_COLORS = {
  Going: "bg-green-500",
  Maybe: "bg-yellow-500",
  "Not Going": "bg-red-500",
  "Not invited yet": "bg-gray-400",
};
```

## Deployment

The application is ready to deploy on your hosting platform (staging/production) using the normal build pipeline (`pnpm build`, `pnpm start`).

## Support

For questions or issues, refer to the project docs in this repository.
