# Leader Flow Optimizations - Keyboard Shortcuts

This document describes the keyboard shortcuts and UI enhancements added to optimize leader workflows.

## Quick Access to Follow-Up List

### Floating Action Button (FAB)

- **Location**: Bottom-right corner of the screen (fixed position)
- **Icon**: Clipboard List icon
- **Action**: Click to navigate to Follow-Up view
- **Tooltip**: "Follow-Up List (Shift+F)"

### Keyboard Shortcut

- **Shortcut**: `Shift + F`
- **Action**: Navigate to Follow-Up view from anywhere in the app
- **Availability**: Global (works from any page)

### Menu Access

- **Location**: Hamburger menu (top-right)
- **Label**: "Follow-Up List"
- **Icon**: Clipboard List icon

## Quick Status Changes

### Keyboard Shortcuts (in PersonDetailsDialog)

When viewing a person's details, leaders can quickly change status using number keys:

- **Press `1`**: Set status to "Yes"
- **Press `2`**: Set status to "Maybe"
- **Press `3`**: Set status to "No"
- **Press `4`**: Set status to "Not Invited"

**Requirements**:

- Available only for leaders (CO_DIRECTOR and above)
- Only works when PersonDetailsDialog is open
- Does NOT work when typing in input fields or textareas

**Visual Hint**: The status display shows "(Press 1-4: Yes/Maybe/No/Not Invited)" for leaders

## Quick Note Entry

### Enhanced Note Input

- **Location**: PersonDetailsDialog → Invite section → "Quick Note"
- **Keyboard Shortcut**: `Ctrl + Enter` (or `Cmd + Enter` on Mac)
- **Action**: Save note immediately without clicking the "Add" button
- **Availability**: Leaders only

**Improvements**:

- Reduced textarea height (2 rows instead of 3) for compact display
- Placeholder text updated to show keyboard shortcut hint
- Inline save button positioned next to textarea
- Label changed to "Quick Note (Leaders Only)"

## Click Count Verification

### Status Update Flow

- **From Map View**: Click district (1) → Click person icon (2) = **2 clicks** ✓
- **Acceptance Criteria**: < 3 clicks ✓ **MET**

### Note Entry Flow

- **From Person View**: Already inline in PersonDetailsDialog
- **Acceptance Criteria**: Inline, not separate page ✓ **MET**

### Follow-Up Access

- **From Anywhere**: Click FAB (1) OR Press Shift+F = **1 click/keystroke** ✓
- **Acceptance Criteria**: One click away from anywhere ✓ **MET**

## Power User Tips

1. **Navigate quickly**: Use `Shift + F` to jump to Follow-Up list anytime
2. **Update status fast**: Open person details, press 1-4 to set status instantly
3. **Add notes efficiently**: Type note, press `Ctrl + Enter` to save
4. **Close dialogs**: Press `Esc` to close any open dialog or panel

## Technical Implementation Notes

- All keyboard shortcuts check for input field focus to prevent conflicts
- Status change shortcuts only fire for leaders
- FAB uses Tailwind CSS utilities and Lucide React icons
- Keyboard event listeners properly cleaned up on unmount
- React hooks ordered correctly before conditional returns
