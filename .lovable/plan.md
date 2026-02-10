

# Ensure Floor Plan Upload Works and Prompt Scale Before Drawing

## Overview

Two improvements to the project creation and editing workflow:

1. **Floor plan upload on new project**: The upload flow in NewProject.tsx already works correctly -- it uploads to the `floor_plan_images` bucket and initializes the multi-page `json_data` structure with the background image. No changes needed here.

2. **Scale prompt before drawing rooms**: When a user selects the Draw or Rectangle tool without having set a scale first, intercept the tool change and prompt them to set the scale. This prevents users from drawing rooms with no real-world measurements, which would make all area calculations meaningless.

## What Changes

When a user clicks the Draw (D) or Rectangle tool -- either via toolbar click or keyboard shortcut -- and no scale has been set on the current page:

- The tool will NOT activate
- A toast notification will appear: "Set scale first -- Calibrate your floor plan scale before drawing rooms so measurements are accurate."
- The Scale tool will be automatically activated instead
- This applies to both desktop toolbar clicks and keyboard shortcuts

The progress bar already visually guides users through the correct order (Floor Plan -> Scale -> Rooms), but currently nothing enforces it. This change adds a soft enforcement.

## When It Will NOT Block

- If scale is already set, Draw/Rectangle tools work normally
- The Scale tool itself is always accessible
- Select, Pan, Hole, Door, Merge, Split tools are unaffected (Hole/Door require existing rooms anyway)

---

## Technical Details

### File to modify

| File | Changes |
|------|---------|
| `src/pages/ProjectEditor.tsx` | Wrap `setActiveTool` in a handler that checks for scale before allowing draw/rectangle tools; update keyboard shortcut handler similarly |

### Implementation

Create a `handleToolChange` wrapper function that:
1. Checks if the requested tool is `'draw'` or `'rectangle'`
2. If so, checks if `scale` (from the active page) is `null`
3. If no scale, shows a toast with a message like "Set your scale first so room measurements are accurate" and switches to the `'scale'` tool instead
4. Otherwise, sets the tool normally

This wrapper replaces direct `setActiveTool` calls in:
- The `EditorToolbar` `onToolChange` prop
- The keyboard shortcut handler (`useEffect` for `d` key)
- The `MobileToolFAB` `onToolChange` prop (if applicable)
- The `handleProgressStepClick` for the 'rooms' step

### Toast behavior

The toast will use the existing `useToast` hook with:
- Title: "Set scale first"
- Description: "Calibrate your floor plan scale before drawing rooms so measurements are accurate."
- No destructive variant -- just informational

After showing the toast, the scale tool activates automatically so the user can immediately start calibrating.

