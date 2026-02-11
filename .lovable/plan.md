

# Transition Drawing Tool

## Problem
Transitions on edges are hard to see and place. The current workflow requires right-clicking an edge to add a transition, then using a sidebar slider to resize it. Users want to visually draw exactly where transitions start and stop on an edge.

## Solution
Add a new **"Transition" drawing tool** to the toolbar. When active, the user clicks on a room edge to set the start point, then clicks again on the same edge to set the end point. A transition is created covering exactly that segment. The tool provides strong visual feedback throughout.

---

## How It Works

1. Select the **Transition tool** from the toolbar (new icon, dashed line with arrow)
2. Hover over any room edge -- the edge highlights in amber and a snap indicator appears
3. **Click once** on the edge to set the transition start point
4. **Move the mouse** along the same edge -- a live amber dashed preview shows the coverage
5. **Click again** on the same edge to set the end point and create the transition
6. The transition is added to the room with the correct `startPercent` and `endPercent`
7. Transition type defaults to `auto`; user can change it via context menu or sidebar panel

Press **Escape** to cancel mid-draw.

---

## Visual Enhancements (Always Visible)

Transitions will be easier to see even when using other tools:
- Transition edges already draw with an amber dashed line and label badges -- this is good
- Add a subtle amber background tint along transition segments (a thin filled strip offset inward from the edge) so transitions are visible at a glance even when zoomed out
- Make the transition dashed line slightly thicker (4px instead of 3px) for better visibility

---

## Changes

### 1. Add `'transition'` to `EditorTool` union

**File: `src/components/editor/EditorCanvas.tsx`**
- Add `'transition'` to the `EditorTool` type
- Add state: `transitionDrawStart: { roomId: string, edgeIndex: number, percent: number } | null`
- In `handlePointerDown` for the transition tool:
  - Find the closest edge on any room (within a hit distance threshold)
  - Calculate the percent along that edge where the click landed
  - If no start is set, record it; if start is set and same edge, create the transition
- In `handlePointerMove`: calculate hover/preview percent along the nearest edge
- Pass preview data to `CanvasRenderer`
- Add the tool to the dependency arrays

### 2. Add toolbar button

**File: `src/components/editor/EditorToolbar.tsx`**
- Add a "Transition" tool button with a dashed-line icon (custom SVG or use an existing icon like `ArrowLeftRight` from lucide)
- Place it after the Door tool in the toolbar
- Show tooltip: "Draw Transition (T)"
- Add keyboard shortcut `T` for the tool

### 3. Add to mobile tool FAB

**File: `src/components/editor/MobileToolFAB.tsx`**
- Add the transition tool to the FAB menu

### 4. Canvas rendering for transition tool

**File: `src/components/editor/CanvasRenderer.tsx`**
- Add new props: `transitionDrawStart`, `transitionPreviewEdge` (for hover preview)
- When transition tool is active:
  - Highlight the nearest edge in amber on hover
  - Show a dot/marker at the snap position on the edge
  - If a start point is set, draw the amber dashed preview from start to cursor position along the edge
- Enhance existing transition rendering:
  - Add a subtle amber fill strip (2-3px wide, semi-transparent) along transition segments so they're always visible

### 5. Edge hit-testing helper

**File: `src/lib/canvas/geometry.ts`**
- Add/use a function `projectPointOntoEdge(point, edgeStart, edgeEnd)` that returns `{ percent: number, distance: number, projectedPoint: CanvasPoint }` 
- This calculates how far along an edge a point falls and how far away from the edge it is
- Used by the transition tool for both hit-testing and percent calculation

### 6. Instruction banner

**File: `src/components/editor/EditorCanvas.tsx`**
- When transition tool is active, show a top banner similar to the scale tool:
  - Before first click: "Click on an edge to start the transition"
  - After first click: "Click again on the same edge to set the end point"

---

## Technical Details

### Edge detection algorithm
When the transition tool is active and the mouse moves:
1. For each room, for each edge, calculate the perpendicular distance from the mouse to the edge segment
2. Find the closest edge within a threshold (e.g., 15px screen space)
3. Calculate the percent along that edge using vector projection
4. Clamp percent to 0.0-1.0

### Creating the transition
When both clicks are complete:
- `startPercent` = min of the two click percents
- `endPercent` = max of the two click percents
- Generate a unique `id` for the transition
- Default `transitionType: 'auto'`
- Dispatch `UPDATE_ROOM` to add to the room's `edgeTransitions` array
- Switch back to the select tool (or stay on transition tool for rapid placement)

### Keyboard shortcut
- `T` key activates the transition tool (added to the existing keyboard handler)
- `Escape` cancels an in-progress transition draw

