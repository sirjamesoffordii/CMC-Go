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
