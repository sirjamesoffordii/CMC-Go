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

## Header Image Optimization
- [x] Redesign header to show full CMC 2026 image (person's face + bottom border visible)
- [x] Overlay all event details (date, location) on top of the image
- [x] Remove separate event details section below image
- [x] Ensure header is compact and doesn't expand too much

## Header Image Positioning Fix
- [x] Adjust image positioning to show person's face (chest up)
- [x] Ensure Chi Alpha | CMC 2026 branding text is fully visible and properly sized
- [x] Show decorative bottom border
- [x] Remove date and location details from header
- [x] Create More Info page with event details (date, location, address)

## Custom Header Design
- [x] Create custom header design without photo
- [x] Recreate "Chi Alpha | CMC 2026 CAMPUS MISSIONS CONFERENCE" branding style
- [x] Use golden/orange background matching CMC aesthetic
- [x] Add geometric pattern elements similar to reference image
- [x] Include decorative bottom border design

## Header Border & Color Adjustments
- [x] Update bottom border to alternating gold/orange and dark sections pattern
- [x] Move map up so everything fits without scrolling
- [x] Change bright blue colors to more muted tones
- [x] Make invited percentage text black instead of blue

## Phase 1: Core Map Experience
- [x] Add pie charts overlaid on each district showing Yes/Maybe/No/Not invited distribution
- [x] Implement hover tooltips with district name, region, and counts
- [x] Add region highlighting when hovering districts in the same region
- [x] Calculate district-level status distribution for pie charts
- [x] Position pie charts at district centroids

## Tooltip Enhancement
- [x] Make hover tooltip larger
- [x] Add visual pie chart to tooltip

## Tooltip Optimization
- [x] Make tooltip more compact with less white space
- [x] Remove Total Invited line

## Tooltip Layout Adjustment
- [x] Rearrange tooltip to show pie chart on left and stats on right

## Tooltip Header Formatting
- [x] Show district name and region name on same line separated by |

## North Dakota Pie Chart Fix
- [x] Investigate why North Dakota pie chart is not showing
- [x] Fix pie chart rendering for North Dakota

## Map Spacing Adjustment
- [x] Move map up to fit everything on screen without scrolling
- [x] Add equal white space on all sides of the map

## Layout Adjustments
- [x] Move "CMC begins in 161 days" closer to the header
- [x] Restore map to larger size (700px)

## Calendar Widget & Map Positioning
- [x] Remove countdown from header
- [x] Create calendar-style date widget with 06 JUL
- [x] Add "In ### days" below calendar widget
- [x] Position calendar widget across from "Going" in metrics section
- [x] Move map much higher (reduce padding)

## Map Padding Reduction
- [x] Reduce map padding to almost touch the metrics numbers

## Zero Padding & Viewport Fit
- [x] Remove all padding from map container
- [x] Ensure entire map fits on screen without scrolling
- [x] Reduce map height if needed to fit viewport

## Map Repositioning
- [x] Move map directly underneath header (before metrics section)
- [x] Increase map size back to 700px
- [x] Reposition metrics section below the map

## Metrics Overlay
- [x] Position metrics section as overlay on top of map (top-left area)
- [x] Keep map at current size and position
- [x] Ensure metrics don't shift or shrink the map

## Calendar Widget Repositioning
- [x] Move calendar widget to bottom right corner of map (around Florida area)
- [x] Separate calendar widget from metrics overlay

## Calendar Widget Position Adjustment
- [x] Move calendar widget slightly lower while keeping it within viewport

## Tooltip Improvements
- [x] Increase font sizes in hover tooltip
- [x] Add more space between status labels and counts
- [x] Change status labels to "Going", "Maybe", "Not Going", "Not Invited Yet"
- [x] Change "No" color from slate to red
- [x] Change "Maybe" color from amber to yellow

## Tooltip Font Size Adjustments
- [x] Decrease status fonts and icon sizes in tooltip
- [x] Increase district name font size
- [x] Increase region font size

## Header Redesign with New Layout
- [ ] Update header to match new design with centered text
- [ ] Use "Chi Alpha | CMC 2026" format with vertical separator
- [ ] Add "CAMPUS MISSIONS CONFERENCE" subtitle below
- [x] Ensure professional centered layout
- [x] Position text closer to bottom border

## Header Redesign with Starburst Graphic
- [x] Add green/olive starburst explosion graphic behind text
- [x] Center text in header (vertically and horizontally)
- [x] Use clean text layout from first reference image
- [x] Position starburst behind "CMC 2026" text

## District Panel Positioning Adjustment
- [x] Set district panel width to 40% of page width
- [x] Position panel to start below header (top-[120px])
- [x] Panel covers map area but not header section
- [x] Panel extends from below header to bottom of viewport

## Panel Resize & Push Content Implementation
- [x] Change district panel from overlay to push-content layout
- [x] Increase district panel default width from 40% to 50%
- [x] Position district panel to start below header (not cover header)
- [x] Add resize handle to district panel for manual width adjustment
- [x] Update Follow Up panel to push content instead of overlay
- [x] Set Follow Up panel default width to 50%
- [x] Position Follow Up panel to start below header (not cover header)
- [x] Add resize handle to Follow Up panel for manual width adjustment
- [x] Ensure both panels can be resized independently
- [x] Store panel widths in component state
- [x] Add visual resize cursor on hover over handles

## Button Color Updates
- [x] Update Login button to use Chi Alpha red (#ED1C24)
- [x] Update Follow Up tab button to use Chi Alpha red (#ED1C24)
- [x] Ensure hover states use darker red shade

## District Panel Redesign
- [x] Update panel header to match hover tooltip design (pie chart + stats side-by-side)
- [x] Show district name and region in header
- [x] Display color-coded status breakdown in header
- [x] Make campus columns much thinner (reduce padding and spacing)
- [x] Minimize whitespace between columns
- [x] Reduce font sizes for compact display
- [x] Optimize person row height to show more on screen
- [x] Ensure all campuses visible without horizontal scrolling
- [x] Minimize vertical scrolling needed

## District Panel Header Enhancement
- [x] Make header fuller and more prominent
- [x] Increase font sizes for better readability
- [x] Better utilize available space
- [x] Create visually impactful design

## District Panel Header Height Optimization
- [x] Reduce overall header height
- [x] Place region name inline with district name (same line)
- [x] Increase district name font size
- [x] Increase region name font size
- [x] Maintain visual hierarchy and readability

## Header Stats Spacing Adjustment
- [x] Reduce horizontal gap between stat columns
- [x] Maintain comfortable readability
- [x] Avoid feeling too cramped

## Further Reduce Stats Spacing
- [x] Reduce horizontal gap significantly (gap-x-3 to gap-x-1)
- [x] Bring metrics much closer together

## Reduce Label-to-Number Spacing
- [x] Remove ml-auto that pushes numbers far right
- [x] Reduce gap between label and number (gap-2.5 to gap-1.5)
- [x] Keep color dot and label close together

## Adjust Stats Column Spacing
- [x] Increase gap-x from 1 to 4 to bring columns closer as groups
- [x] All four stats should feel like one cohesive block

## Vertical Stats Stacking
- [x] Stack Going above Not Going in left column
- [x] Stack Maybe above Not Invited Yet in right column
- [x] Bring both columns close together next to pie chart (gap-3)
- [x] Create compact two-column vertical layout

## 4-Column Horizontal Stats Layout
- [x] Restructure to 4 horizontal columns (Going | Not Going | Maybe | Not Invited Yet)
- [x] Stack label above number in each column
- [x] Left-align labels and numbers within each column
- [x] Add spacing between columns (gap-4)

## Replace Header Background Image
- [x] Copy Chi Alpha CMC 2026 banner image to public folder
- [x] Update header to use image as background
- [x] Remove gradient background and starburst graphic
- [x] Remove text overlay (image contains text)

## Remove Header Bottom Border
- [x] Remove decorative bottom border stripes from header

## Stats Layout with Aligned Numbers
- [x] Restructure to 2 columns (Going/Not Going | Maybe/Not Invited Yet)
- [x] Left-align labels (color dot + text)
- [x] Right-align numbers for uniform appearance (justify-between)
- [x] Stack vertically within each column (gap-1.5)

## Increase Stats Column Spacing
- [x] Increase gap between left and right stats columns (gap-6 to gap-10)
- [x] Move Maybe/Not Invited Yet further from Going/Not Going numbers

## Reduce Label-Number Spacing
- [x] Reduce min-width on stat rows (left: 140px→110px, right: 160px→140px)
- [x] Maintain vertical alignment of numbers

## Add Invited Percentage to Header
- [x] Calculate invited percentage (Going + Maybe + Not Going) / Total
- [x] Display percentage prominently in district panel header
- [x] Format as "X% Invited" with blue color for visibility

## Change Invited Percentage Color
- [x] Change invited percentage text color from blue-600 to gray-900 (black)

## Inline Name Editing
- [x] Add tRPC procedure to update district name
- [x] Add tRPC procedure to update district region
- [x] Add tRPC procedure to update campus name
- [x] Add tRPC procedure to update person name
- [x] Implement inline editing for district name in header
- [x] Implement inline editing for region in header
- [x] Implement inline editing for campus names in columns
- [x] Implement inline editing for person names in rows
- [x] Add click-to-edit UI with input fields (EditableText component)
- [x] Save changes on blur or Enter key
- [x] Cancel changes on Escape key

## Campus Column UX Enhancements
- [x] Change cursor to text cursor (cursor-text) for district name hover
- [x] Change cursor to text cursor for region name hover
- [x] Change cursor to text cursor for campus name hover
- [x] Add 3-dot menu button to campus column headers (appears on hover)
- [x] Implement sort options in 3-dot menu (by name, by status, by date)
- [x] Add Archive button in 3-dot menu (disabled if people exist)
- [x] Add grab cursor (cursor-grab) on campus header for drag-and-drop
- [x] Implement drag-and-drop reordering for campus columns
- [x] Implement drag-and-drop for person cards between columns
- [x] Update campus column corners to be more rounded (rounded-lg)
- [x] Extend divider line below campus header with curved ends
- [ ] Add backend procedure to archive campus
- [ ] Add backend procedure to update campus display order
- [ ] Add backend procedure to move person to different campus

## Campus Column Header Fixes
- [x] Remove curved divider line extensions from campus header
- [x] Move 3-dot menu to edge/background of column without interfering with name
- [x] Move grab cursor area to edges of header/top of column
- [x] Fix campus name editing not saving changes (added useEffect to sync value)

## Keyboard Shortcuts Implementation
- [x] Add Escape key listener to close district panel
- [x] Add arrow key listeners (Left/Right) to navigate between districts
- [x] Find current district index in districts list
- [x] Navigate to previous district on Left arrow (wraps to last)
- [x] Navigate to next district on Right arrow (wraps to first)
- [x] Handle edge cases (first/last district with wrapping)
- [x] Only activate shortcuts when district panel is open

## Arrow Key Navigation & Click-Outside Fixes
- [x] Filter districts by current region for arrow key navigation
- [x] Only cycle through districts in same region as current district
- [x] Add click-outside-to-close for district panel
- [x] Add click-outside-to-close for follow-up panel
- [x] Only close on empty space clicks (e.target === e.currentTarget check)

## Geographic Adjacency Navigation
- [x] Add adjacency data to districts (leftNeighbor, rightNeighbor fields)
- [x] Define adjacency relationships for each region's districts
- [x] Update arrow key navigation to use adjacency instead of list order
- [x] Left arrow moves to leftNeighbor district
- [x] Right arrow moves to rightNeighbor district
- [x] Handle wrapping at region boundaries (rightmost → leftmost via adjacency)
- [x] Ensure each district appears only once per cycle (guaranteed by adjacency map)

## Auto-Size District Panel
- [x] Remove fixed width (50%) from district panel
- [x] Use auto width based on content (width: auto)
- [x] Set max-width to prevent panel from being too wide (80%)
- [x] Add min-w-fit to DistrictPanel for proper content sizing

## Fix Click-Outside-to-Close
- [x] Debug why click-outside handler is not working
- [x] Ensure empty space clicks close the district panel
- [x] Test click handler on map area (clicks on padding/empty space)

## Fix Click-to-Close and ESC for Panels
- [x] Make clicks on map canvas close panels (not just padding)
- [x] Clicks anywhere except buttons/interactive elements should close panels
- [x] Add ESC key support to close follow-up panel
- [x] Ensure ESC closes whichever panel is open

## Universal Panel Closing (ESC + Click-Outside)
- [x] Add click-outside detection for follow-up panel
- [x] Clicking on map or empty space should close follow-up panel
- [x] ESC should work for follow-up panel independently
- [x] Ensure consistent behavior across all panels
- [x] Add pointer-events-none to metrics overlay and calendar widget
- [x] Fix InteractiveMap to handle clicks on SVG container/canvas
- [x] Add dedicated background click layer at z-0 in InteractiveMap

## Header Background Editing
- [x] Add edit pen icon that appears on hover over the header
- [x] Implement file upload dialog when edit icon is clicked
- [x] Upload new image to S3 storage
- [x] Update header background with new image
- [x] Store header image URL in database or settings
- [x] Ensure proper image sizing and positioning
- [x] Create settings table in database
- [x] Add tRPC procedures for getting and setting settings
- [x] Add uploadHeaderImage mutation to upload to S3
- [x] Fetch saved header image on page load
- [x] Show local preview immediately while uploading

## Image Cropping Tool for Header
- [x] Install react-easy-crop library
- [x] Create ImageCropModal component with crop area controls
- [x] Add zoom slider for image scaling
- [x] Implement crop area adjustment with drag and pinch
- [x] Add Save and Cancel buttons to modal
- [x] Process cropped image to create final blob
- [x] Integrate modal into header image upload flow
- [x] Show modal after file selection, before upload
- [x] Upload cropped image instead of original
- [x] Ensure proper aspect ratio for header (wide format)

## Header Image Bug Fixes
- [x] Fix header cut off at top in fullscreen mode
- [x] Debug S3 upload - added error logging and handling
- [x] Check database save for header image URL - added logging
- [x] Add zoom out capability (min zoom 0.5x) for fitting images
- [ ] Test header image persistence across page refreshes

## Crop Modal Improvements
- [x] Fix horizontal movement constraint in image cropper (set restrictPosition=false)
- [x] Center image by default instead of far left (reset crop on open)
- [x] Adjust aspect ratio or crop settings for better movement (minZoom=0.1, horizontal-cover)

## Header Background Improvements
- [x] Change default/empty space background from black to white
- [x] Add edge extension feature to fill horizontal gaps without stretching content
- [x] Sample edge pixels and extend them to fill remaining space
- [x] Add toggle switch to enable/disable edge extension

## Fix Image Crop Output Issues
- [x] Fix image shrinking - keep cropped area at original size
- [x] Fix edge sampling - sample from actual image edges using temp canvas
- [x] Sample thicker edge strip (20px or 10% of width) for better color blending
- [x] Ensure cropped image fills header properly with bg-cover mode

## Background Color Picker for Header
- [x] Extract dominant colors from uploaded image edges
- [x] Display color swatches in crop modal
- [x] Allow user to select background color
- [x] Store selected color with header image
- [x] Apply selected color to header background
- [x] Include custom color picker input

## Persist Header Background Color
- [x] Save background color to database alongside header image
- [x] Load saved background color on page load
- [x] Update uploadHeaderImage mutation to accept backgroundColor

## Follow Up Tab Styling
- [x] Make tab more transparent dark grey (bg-gray-800/30)
- [x] Tab should be barely visible by default (text-white/60, opacity-60)
- [x] Smooth slide-out animation on hover/proximity (transition-all duration-300)
- [x] Change text to "Follow Ups"

## Header Fixes
- [ ] Debug header background not persisting after refresh
- [ ] Add manual header height adjustment (draggable resize)
- [ ] Save header height to database

## Header Height Adjustment
- [x] Add header height state variable
- [x] Add resize handle at bottom of header (appears on hover)
- [x] Implement drag-to-resize functionality
- [x] Load saved header height from database
- [ ] Save header height to database on resize end

## Header Default Changes
- [x] Reduce default header height (80px instead of 120px)
- [x] Set default header background to white (no image by default)

## Header Height & Crop Aspect Ratio Fix
- [x] Update default header height to 110px (slightly taller than screenshot)
- [x] Fix crop aspect ratio to match actual header dimensions (1280/110)
- [x] Ensure cropped image displays correctly without top being cut off (bg-top)
- [x] Change background-position from center to top for header image
- [x] Center buttons vertically in header

## Update SVG Map
- [ ] Replace old SVG with new ChiAlphaDistrictLinesPlainSVG.svg
- [ ] Update district IDs to match new SVG
- [ ] Adjust any references to district paths
- [ ] Test map interactions with new SVG

## Update SVG Map
- [x] Replace old map.svg with new ChiAlphaDistrictLinesPlainSVG.svg
- [x] Update district centroids to match new SVG IDs (48 districts)
- [x] Update database districts to match new SVG path IDs
- [x] Verify all districts are clickable and display correctly

## Remove Floating Pie Charts
- [x] Remove pie chart overlay from InteractiveMap component
- [x] Keep hover tooltips with pie charts (only remove floating ones on map)

## Follow Up Tab Color Change
- [x] Change Follow Up tab color from red to black

## Follow Up Tab Glow Effect
- [x] Add subtle glowing effect to Follow Up tab for better visibility

## Chi Alpha XA Mighty Toolbar Header
- [ ] Replace header with black toolbar style (same space)
- [ ] Add editable XA logo on the left side
- [ ] Add "Chi Alpha Campus Ministries" text next to logo
- [ ] Keep More Info and Login buttons on the right
- [ ] Background should be customizable (default black)
- [ ] Logo should be customizable (click to change)

## Chi Alpha XA Toolbar Header (Final)
- [ ] Replace header with black toolbar style
- [ ] Add editable XA logo on the left (click to change)
- [ ] Add "Chi Alpha Campus Ministries" text next to logo
- [ ] Keep More Info and Login buttons on the right
- [ ] Background color customizable (default black, can change to any color)
- [ ] Logo customizable (click to upload new logo)

## Rich Text Header Editor
- [x] Create editable logo on the left (click to upload new image)
- [x] Add rich text editor in the middle of header
- [x] Support bold, italic, underline formatting
- [x] Support font size changes
- [x] Support font family selection
- [x] Keep More Info and Login buttons static on the right
- [x] Background color customizable (default black)
- [x] Save header content to database
- [x] Load saved header content on page load

## Search Feature
- [x] Add search bar to header (like Chi Alpha toolbar)
- [x] Search across people, campuses, and districts
- [x] Show search results dropdown
- [x] Click result to navigate to that item

## Header Styling Refinement
- [x] Match Chi Alpha toolbar colors exactly (darker black background)
- [x] Adjust font size and weight to match Chi Alpha
- [x] Ensure logo size matches Chi Alpha toolbar

## Share Button Feature
- [x] Add share button to header
- [x] Include copy link option
- [x] Add text/SMS sharing with pre-filled message
- [x] Add email sharing with pre-filled subject and body
- [x] Add social media sharing (Facebook, Twitter/X)
- [x] Add GroupMe sharing option
- [x] Pre-filled invitation message for leaders

## Editable Invitation Message
- [x] Add editable text area for invitation message in Share modal
- [x] Allow leaders to personalize the message before sharing
- [x] Reset to default message option

## Edit Header Button Redesign
- [x] Move Edit button to top left corner of header
- [x] Use pen icon with "Edit" text
- [x] Position absolutely so it doesn't shift header content
- [x] Show on hover near the button area

## Map Container Elevation Effect
- [x] Add soft diffused drop shadow to map container as a whole
- [x] Ensure shadow is subtle (low opacity, large blur, no hard edges)
- [x] No border, no card/panel appearance
- [x] Maintain tooltip visual hierarchy (tooltips float above map with shadow-2xl)
- [x] Keep all existing map styling unchanged (colors, strokes, regions)

## Professional Refinement Pass
### Map Colors
- [ ] Reduce region saturation by 20-30%
- [ ] Preserve hue relationships between regions
- [ ] Use earthy, muted tones

### Map Boundaries & Hover
- [ ] Reduce boundary stroke thickness
- [ ] Dim non-active regions on hover
- [ ] Smooth, understated transitions

### Tooltip Polish
- [ ] Refine spacing and typography
- [ ] Soft consistent shadow
- [ ] Professional informative tone

### Header Refinement
- [ ] Soften pure black to near-black
- [ ] Increase internal spacing
- [ ] Balance vertical alignment

### Slideout Panel Polish
- [ ] Typography hierarchy refinement
- [ ] Row spacing in tables
- [ ] Reduce visual clutter

### Typography & Micro-details
- [ ] Reduce overuse of bold
- [ ] Increase line-height
- [ ] Alignment and padding consistency

## Map Styling Update (User Provided)
- [x] Replace regionColors with new muted "tool-grade" palette
- [x] Add premium styling constants (BORDER_COLOR, BORDER_WIDTH, etc.)
- [x] Update hover behavior - focus district, dim everything else
- [x] Use faster transitions (160ms) for premium feel

## Canvas Background Color
- [x] Change page background from white to off-white (bg-slate-50)

## Tooltip Polish
- [x] Update tooltip wrapper with bg-white/95, backdrop-blur-sm, rounded-xl, shadow-xl, border-gray-200

## UI Refinements Pass
- [x] Match metrics overlay background to off-white tone
- [x] Add subtle paper texture to canvas background
- [x] Ensure tooltip contrast against off-white canvas
- [x] Add fade-in animation to tooltip

## Richer Palette + Lighter Dimming
- [x] Update region colors to richer, deeper tones (premium, not cartoon)
- [x] Reduce border width slightly for premium feel
- [x] Reduce non-hover dimming to subtle level (0.78 opacity)
- [x] Add premium focus filter with saturation and brightness boost

## Project Cleanup
- [x] Remove old/unused SVG files (ChiAlphaDistrictLinesPlainSVG.svg)
- [x] Remove backup files (vite.config.ts.bak)
- [x] Remove unused test files (test-map.html, map-visual.png, cmc-header-banner.png, xa-toolbar-header.png)
- [x] Clear dist folder (build artifacts)

## Local Development Setup
- [x] Add README.md with local setup instructions for Cursor
- [x] Document all required environment variables in README
- [x] Provide step-by-step instructions for getting credentials from Manus
- [x] Note: seed data not changed (database already has correct districts)

## Data Consistency Fixes
- [x] Fix Illinois typo (Illinous → Illinois) in seed-districts.json
- [x] Verify map.svg has inkscape:label="Illinois" (confirmed)
- [x] Consolidate Mid-Atlantic (Extended) to Mid-Atlantic in seed-districts.json
- [x] Remove Mid-Atlantic (Extended) color key from InteractiveMap.tsx

## Add Campus Column Feature
- [x] Add "+" button to create new campus column in district panel
- [x] Implement createCampus tRPC mutation
- [x] Allow naming new campus inline after creation (uses EditableText component)

## Illinois Spelling Normalization
- [x] Search entire codebase for "Illinous" references (found in database only)
- [x] Fix scripts/seed-districts.json (Illinous → Illinois) - already correct
- [x] Fix client/public/map.svg inkscape:label (Illinous → Illinois) - already correct
- [x] Update database records (people and campuses tables) - updated and deleted old Illinous district
- [x] Verify no "Illinous" references remain in repo (verified in code and database)
- [x] Test that Illinois highlights correctly on map (verified - app loads without errors)
- [x] Test that Illinois counts appear in region rollups (metrics show 171/243 correctly)

## Fix Region Color Assignments
- [x] Compare correct Chi Alpha map with current app colors
- [x] Identify all districts with wrong region assignments (5 districts need changes)
- [x] Update North Carolina: Mid-Atlantic → Southeast
- [x] Update Tennessee: Mid-Atlantic → Southeast
- [x] Update Arkansas: South Central → Texico
- [x] Update Oklahoma: South Central → Texico
- [x] Update Mississippi: Southeast → South Central
- [x] Adjust Texico region color to be more pink-purple (#B85FA3)
- [x] Verify map colors match the correct reference map (Texico now pink-purple, regions corrected)
- [x] Test that all region rollups are accurate (verified via screenshot)

## Verify Against Authoritative Chi Alpha Mapping
- [x] Compare all current district-region assignments with source of truth
- [x] Revert North Carolina: Southeast → Mid-Atlantic
- [x] Revert Tennessee: Southeast → Mid-Atlantic
- [x] Revert Arkansas: Texico → South Central
- [x] Revert Oklahoma: Texico → South Central
- [x] Revert Mississippi: South Central → Southeast
- [x] Update seed-districts.json with correct mappings
- [x] Verify all district names match SVG layer names exactly
- [x] Ensure all regions match authoritative document
