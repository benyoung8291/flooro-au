

# Enhanced Canvas Interaction, Context Menus, Hole Management, and Calculations

## Overview

This plan covers six interconnected improvements to the project editor:

1. **Click-and-hold panning** -- Remove the need to switch between Select and Pan modes
2. **Right-click context menus** -- On rooms (material, details, seams), edges (transitions), and cutouts (delete, adjust)
3. **Rectangle room drawing** -- Ensure the Draw Room tool supports rectangle mode, and update the Cut Hole icon
4. **Cutout (hole) editing** -- Drag corners and edges to resize holes, right-click to delete
5. **Rectangle-style hole cutting** -- 2-click rectangle approach like the room tool
6. **Hole deduction in calculations** -- Verify holes reduce material quantities correctly

---

## 1. Unified Click-to-Select + Hold-to-Pan Interaction

Currently the user must switch between `select` and `pan` tools. The new behavior:

- **Short click** (mousedown then mouseup within ~200ms and ~5px movement): selects rooms, edges, vertices
- **Click and hold + drag** (movement beyond ~5px threshold): pans the canvas
- Middle-click and scroll-wheel zoom remain unchanged
- The dedicated "Pan" tool button stays in the toolbar as a fallback

### Technical approach

In `EditorCanvas.tsx`, update `handlePointerDown` for the `select` case:
- Record timestamp and position on pointer down
- Do NOT immediately select -- defer until pointer up
- In `handlePointerMove`: if pointer is down and movement exceeds 5px, begin panning
- In `handlePointerUp`: if movement was below threshold, treat as a click and run selection logic

New state variables:
- `pointerDownTime: number | null`
- `pointerDownPos: { x: number; y: number } | null`
- `isSelectPanning: boolean`

---

## 2. Right-Click Context Menus

### 2a. Room Context Menu (right-click inside a room polygon)

Menu items:
- **Assign Material** -- opens material selection dialog
- **Edit Room Details** -- navigates to the RoomDetailView
- **Rename Room** -- inline rename
- **Adjust Seam Positioning** -- opens SeamEditor
- **Fill Direction** -- rotate lay direction
- Separator
- **Delete Room** -- with confirmation

### 2b. Edge Context Menu (right-click on a room edge)

Menu items:
- **Set as Transition** / **Remove Transition** -- toggles transition
- **Transition Type** submenu -- Reducer, Threshold, T-Molding, End Cap, Ramp, Auto
- **Link Adjacent Room** -- if shared edge detected

### 2c. Cutout Context Menu (right-click on a hole)

Menu items:
- **Delete Cutout** -- removes the hole from the parent room
- **Edit Cutout** -- future: opens detail view (placeholder)

### Technical approach

- Create `CanvasContextMenu.tsx` using Radix `ContextMenu` primitives (already installed)
- Add `onContextMenu` handler to the canvas in `EditorCanvas.tsx`
- Hit-detect what was right-clicked using `isPointInPolygon` for rooms and holes, `findWallAtPoint` for edges
- Hole detection must be checked BEFORE room detection (holes are inside rooms)
- Store context menu state: `contextMenuTarget: { type: 'room' | 'edge' | 'hole', roomId, holeId?, edgeIndex?, position }`

---

## 3. Cutout (Hole) Editing -- Drag Corners and Edges to Resize

Currently holes can only be created, not adjusted. This adds full interactive editing.

### 3a. Hit Detection for Hole Vertices and Edges

Extend `useCanvasEditing.ts` to detect hole geometry:
- Add `findHoleVertexAtPoint()` -- iterates through all rooms' holes, checking each vertex
- Add `findHoleWallAtPoint()` -- same pattern, checks hole edge segments
- Returns `{ roomId, holeId, vertexIndex/wallIndex }` to identify what was hit
- Priority order: hole vertices > hole walls > room curve controls > room vertices > room walls

### 3b. Drag Hole Corners

When a hole vertex is detected on pointer down:
- Store drag state with type `'holeVertex'`
- Track `roomId`, `holeId`, `vertexIndex`, and `originalPoints`
- On drag move, update only that vertex position in the hole's points array
- On drag end, commit via `UPDATE_ROOM` with the modified holes array

### 3c. Drag Hole Edges (Walls)

When a hole wall segment is detected:
- Store drag state with type `'holeWall'`
- Track both endpoints of the wall
- On drag move, translate both endpoints by the delta
- Commit via `UPDATE_ROOM` with updated hole points

### Technical changes

**`useCanvasEditing.ts`:**
- Extend `DragState` interface to include `holeId: string | null` and new types `'holeVertex' | 'holeWall'`
- Add `hoveredHoleVertex` and `hoveredHoleWall` state
- Update `handleHover`, `startDrag`, `updateDrag`, `endDrag` to handle hole elements
- Hole elements get highest priority in hit detection (they're visually "on top")

**`CanvasRenderer.tsx`:**
- Draw hole vertices (small circles) when the parent room is selected -- mirroring how room vertices are drawn
- Highlight hovered hole vertices/walls the same way room vertices/walls are

**`EditorCanvas.tsx`:**
- Pass hole hover/drag state from `useCanvasEditing` through to the renderer

---

## 4. Cutout Deletion via Right-Click

### New Canvas Action

Add a new action type to the state management:

```text
CanvasAction:
  | { type: 'DELETE_HOLE'; roomId: string; holeId: string }
  | { type: 'UPDATE_HOLE'; roomId: string; holeId: string; updates: Partial<Hole> }
```

**`types.ts`:** Add `DELETE_HOLE` and `UPDATE_HOLE` to `CanvasAction` union type.

**`useCanvasHistory.ts`:** Add reducer cases:
- `DELETE_HOLE`: filters the hole out of the room's holes array
- `UPDATE_HOLE`: updates hole properties (points, edgeCurves) -- used by drag operations

The right-click context menu's "Delete Cutout" action dispatches `DELETE_HOLE`.

---

## 5. Rectangle-Style Hole Cutting + Updated Icon

### 5a. Rectangle Hole Mode

Currently the hole tool draws freeform polygons (click each corner, close the shape). Update to support 2-click rectangle:
- First click sets corner A
- Second click sets corner B (opposite corner)
- Automatically creates a rectangular hole from the two corners
- Preview the rectangle while drawing (dashed outline)

In `EditorCanvas.tsx`, update the `hole` case in `handlePointerDown`:
- Use `holeRectStart` state (similar to `rectangleStart` for room tool)
- First click stores the start point
- Second click creates 4-point rectangular hole and dispatches `ADD_HOLE`

### 5b. Updated Hole Tool Icon

In `EditorToolbar.tsx`:
- Replace the `SquareDashed` icon with a custom composite that shows a dashed rectangle with scissors
- Use `ScissorsSquareDashedBottom` from lucide-react (if available) or create a small custom SVG component
- Update tooltip to "Cut Hole / Void"

### 5c. Preview While Drawing

In `CanvasRenderer.tsx`:
- When hole tool is active and one point has been placed, draw a dashed rectangle from the start point to the cursor position
- Use red dashed outline to match the existing hole rendering style

---

## 6. Hole Deduction in Material Calculations

### Current State (Already Working)

The `calculateRoomNetArea()` function in `geometry.ts` already deducts hole areas:

```text
grossArea - sum(hole areas) = netArea
```

This net area flows through to:
- `calculations.ts` (cost calculations)
- `greedyStrip.ts` (roll material strip plans)
- `patternCalculator.ts` (tile calculations)
- `labor/calculations.ts` (labor estimates)

### Verification Needed

1. **Strip plan**: Verify that `greedyStrip.ts` uses net area (it does -- line 146)
2. **Perimeter**: Confirm `calculatePerimeter` only measures room walls, not hole edges (correct -- holes are separate)
3. **Accessories**: Coving and smooth edge should use room perimeter only, not include holes (correct)

### Display Enhancement

In `TakeoffPanel.tsx`, when a room has holes:
- Show "Gross Area" and "Net Area" separately
- Show deduction: "Cutouts: -X.XX m2 (N holes)"
- This makes the impact of holes visible to the user

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/canvas/types.ts` | Add `DELETE_HOLE` and `UPDATE_HOLE` actions |
| `src/hooks/useCanvasHistory.ts` | Add reducer cases for new hole actions |
| `src/hooks/useCanvasEditing.ts` | Add hole vertex/wall hit detection, drag support |
| `src/components/editor/EditorCanvas.tsx` | Unified click/pan, right-click handler, rectangle hole mode |
| `src/components/editor/EditorToolbar.tsx` | Update hole tool icon |
| `src/components/editor/CanvasRenderer.tsx` | Hole vertices rendering, rectangle hole preview |
| `src/components/editor/CanvasContextMenu.tsx` | **New file** -- context menu for rooms, edges, holes |
| `src/components/editor/TakeoffPanel.tsx` | Show gross/net area with hole deduction |

## Implementation Order

1. Add `DELETE_HOLE` and `UPDATE_HOLE` action types and reducer logic
2. Extend `useCanvasEditing` with hole vertex/wall hit detection and drag
3. Update `CanvasRenderer` to draw hole vertices and hover highlights
4. Implement unified click-to-select + hold-to-pan
5. Rectangle-style hole cutting with preview
6. Update hole tool icon (dashed box with scissors)
7. Create `CanvasContextMenu` with room, edge, and hole menus
8. Add gross/net area display in TakeoffPanel

