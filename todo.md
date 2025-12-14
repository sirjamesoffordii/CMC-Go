# CMC Go TODO

## Database & Backend
- [x] Create database schema (Districts, Campuses, People, Needs, Notes)
- [x] Build seed data script from Excel file
- [x] Implement tRPC procedures for districts
- [x] Implement tRPC procedures for campuses
- [x] Implement tRPC procedures for people (list, create, update status)
- [x] Implement tRPC procedures for notes (create, list, toggle leader-only)
- [x] Implement tRPC procedures for needs (create, list, resolve)
- [x] Implement metrics calculation procedure (% Invited, Going count)

## Frontend - Map Interface
- [x] Copy SVG map to public folder
- [x] Create interactive map component with hover effects
- [x] Implement district selection on click
- [x] Add visual states for selected/hover districts
- [x] Style map with shadow, border, rounded corners

## Frontend - Left Panel
- [x] Create slide-out panel component (push layout)
- [x] Display district header with name, region, summary counts
- [x] Render campus columns layout
- [x] Implement person rows with status bar
- [x] Add status cycling on click (Not invited yet → Maybe → Going → Not Going)
- [x] Implement quick-add input at bottom of each campus column
- [x] Add optimistic updates for status changes

## Frontend - Notes & Needs
- [x] Create notes/needs modal or expandable UI
- [x] Implement Financial/Other need type selection
- [x] Add amount field for Financial needs
- [x] Add leader-only flag for notes
- [x] Show indicator on person row when notes/needs exist
- [x] Implement resolve/activate toggle for needs

## Frontend - Header & Metrics
- [x] Create top header with app name
- [x] Display % Invited metric
- [x] Display Going count
- [x] Add countdown to CMC
- [x] Add More Info button
- [x] Add Login button
- [x] Add Follow Up tab/button

## Frontend - Follow-up Page
- [x] Create Follow-up page route
- [x] Implement table with columns: Person, Campus, District, Status, Last Updated, Active Needs, Note snippet
- [x] Add default filter (Maybe status OR active needs)
- [x] Make table sortable/filterable

## Testing & Documentation
- [x] Test all status cycling functionality
- [x] Test optimistic updates
- [x] Test data seeding
- [x] Create README with SVG mapping explanation
- [x] Test follow-up page filters
- [x] Create checkpoint

## Bug Fixes
- [x] Fix district click functionality - fixed Illinois typo in seed data to match SVG
- [x] Fix missing React imports in Home.tsx causing component to fail
- [x] Fix map click handlers - fixed getAttribute for inkscape:label
- [x] Style map with regional colors (Northwest=cyan, Big Sky=tan, Great Plains North=purple, etc.)
- [x] Refine map styling - thinner borders, more muted colors, sharper edges
- [x] Apply premium styling - ultra-thin borders (0.3px) and sophisticated color palette
- [x] Create visual overlay layer - polished map appearance with SVG as invisible click zones
- [x] Increase blur to fill gaps better
- [x] Add white outlines to all districts
- [ ] Add dotted white lines for internal state boundaries (need to identify which paths)
- [x] Reduce white outline thickness to 0.6px
- [x] Reduce blur to 0.3px to preserve sharp edges
- [x] Remove map container white box and create unified canvas layout with header
- [x] Move header metrics (% Invited, Going count, CMC countdown) onto main canvas background
- [x] Add dividing line below header row (CMC Go + buttons) while keeping unified background
- [x] Increase map size to make it more prominent on canvas
- [x] Change canvas and background from blue gradient to white
- [x] Move map up to fit entire map on screen without scrolling
- [x] Move CMC countdown to top right corner
- [x] Update CMC date to July 6, 2025
- [x] Move countdown to right side of canvas aligned with Going metric
- [x] Remove negative sign from countdown using Math.abs()
- [x] Make Going the hero metric with larger text
- [x] Move Invited underneath Going showing % and actual count (172 / 1200)
- [x] Restructure invited display: percentage on first line, count on second line
- [x] Reduce Going metric size from text-6xl to text-4xl

## Header Redesign & Follow Up Panel
- [x] Remove "CMC Go" title from top left
- [x] Add CMC 2026 hero image to header section
- [x] Add event details (dates, location, address) to header
- [x] Convert Follow Up button to tab-style button attached to right side
- [x] Create Follow Up panel that slides in from the right
- [x] Move Follow Up page content into the right-side panel
