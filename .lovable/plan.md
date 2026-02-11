

# Doors and Transitions Enhancement Plan

## Overview

Four enhancements to the editor's door and transition systems:

1. **Delete doors** -- currently doors can be placed but never removed
2. **Drag-to-resize doors** -- allow interactive resizing on the canvas
3. **Partial-edge transitions** -- allow a transition to cover only a portion of an edge (e.g. half wall, half transition), and support multiple transition instances per edge
4. **Add "Alu Angle" transition types** -- new transition type with size variants (4mm, 6mm, 8mm, 10mm, 12mm)

---

## 1. Delete Doors

**Current state**: No DELETE_DOOR action exists; no UI to remove doors once placed.

### Changes

- **`src/lib/canvas/types.ts`** -- Add `DELETE_DOOR` action to the `CanvasAction` union:
  `{ type: 'DELETE_DOOR'; roomId: string; doorId: string }`

- **`src/hooks/useCanvasHistory.ts`** -- Handle the new `DELETE_DOOR` case in the reducer (filter the door out of `room.doors`).

- **`src/components/editor/CanvasContextMenu.tsx`** -- Add a "Door" context target type. When right-clicking a door, show a context menu with "Delete Door" option. Add `onDeleteDoor` callback prop.

- **`src/components/editor/EditorCanvas.tsx`** -- Detect right-click on doors (hit-test the door rectangles) and open the door context menu. Wire `onDeleteDoor` to dispatch `DELETE_DOOR`.

- **`src/components/editor/RoomDetailView.tsx`** -- In the Overview tab, list doors with a delete button next to each so users can also remove them from the sidebar.

---

## 2. Drag-to-Resize Doors

**Current state**: Doors render as fixed-width rectangles; no interactive handles.

### Changes

- **`src/components/editor/CanvasRenderer.tsx`** -- When a room is selected, draw resize handles (small squares) at the left and right ends of each door rectangle.

- **`src/components/editor/EditorCanvas.tsx`** -- Add door-resize interaction state:
  - On pointer down, hit-test door resize handles
  - Track `draggingDoorResize: { roomId, doorId, side: 'left'|'right' }` state
  - On pointer move, calculate the new width based on drag distance along the door's orientation axis, clamping to min 400mm and max 2000mm
  - On pointer up, dispatch `UPDATE_ROOM` with the updated door width
  - Show a tooltip with the current width during drag

---

## 3. Partial-Edge Transitions (Multiple Transitions Per Edge)

**Current state**: Each edge can have zero or one `EdgeTransition` object, identified by `edgeIndex`. The entire edge is either a wall or a transition.

### Type Changes (`src/lib/canvas/types.ts`)

Add `startPercent` and `endPercent` fields to `EdgeTransition`:

```text
interface EdgeTransition {
  id: string;                     // NEW: unique ID for this transition instance
  edgeIndex: number;
  startPercent: number;           // NEW: 0.0-1.0, where along the edge this starts
  endPercent: number;             // NEW: 0.0-1.0, where along the edge this ends
  adjacentRoomId?: string;
  adjacentRoomName?: string;
  transitionType: '...' | 'alu-angle';  // expanded union
  aluAngleSizeMm?: number;       // NEW: for alu-angle type
  materialId?: string;
  heightDifferenceMm?: number;
  notes?: string;
}
```

Defaults: `startPercent: 0`, `endPercent: 1` (full edge, backward compatible).

### Data Migration

Existing transitions without `id`/`startPercent`/`endPercent` will be auto-filled with defaults when loaded (in the reducer's `LOAD_STATE` handler).

### EdgeTransitionsPanel Changes (`src/components/editor/EdgeTransitionsPanel.tsx`)

- Change from "one transition per edge" to "list of transitions on this edge"
- Each edge section shows its transition segments with start% and end% sliders
- "Add Transition" button on each edge to add another segment
- Each transition segment gets a delete button
- Validate that segments don't overlap on the same edge

### Canvas Rendering Changes (`src/components/editor/CanvasRenderer.tsx`)

- When drawing transition edges, only draw the dashed amber style for the portion between `startPercent` and `endPercent`; draw the rest as a normal wall
- Draw transition label badges at the midpoint of each segment rather than the edge midpoint
- Support multiple transition badges on the same edge

### Context Menu Changes (`src/components/editor/CanvasContextMenu.tsx`)

- "Add Transition" now creates a new transition segment on the edge (defaults to the full remaining uncovered portion)
- Show existing transition segments with individual delete options

---

## 4. Alu Angle Transition Type

### Changes

- **`src/lib/canvas/types.ts`** -- Add `'alu-angle'` to the `transitionType` union in `EdgeTransition`. Add optional `aluAngleSizeMm` field.

- **`src/lib/transitions/heightCalculator.ts`** -- Update `getTransitionLabel()` to include alu-angle labels. Add alu angle sizes constant:
  ```text
  ALU_ANGLE_SIZES = [4, 6, 8, 10, 12, 15, 20] (mm)
  ```

- **`src/components/editor/EdgeTransitionsPanel.tsx`** -- Add "Alu Angle" option to the transition type dropdown. When selected, show a secondary dropdown to pick the size (4mm, 6mm, 8mm, 10mm, 12mm, etc.).

- **`src/components/editor/CanvasContextMenu.tsx`** -- Add "Alu Angle" to the edge context menu transition types.

- **`src/components/editor/CanvasRenderer.tsx`** -- Display "Alu" in the transition label badge when type is alu-angle, including the size.

---

## Technical Notes

- All changes are client-side only (no database migration needed since room data is stored as JSON in the `projects.json_data` column).
- Backward compatibility is maintained: existing `EdgeTransition` objects without `id`, `startPercent`, or `endPercent` default to full-edge coverage.
- Door resize interaction follows the same pattern as vertex dragging (pointer down -> track state -> pointer move -> update -> pointer up -> commit).
- Multiple transitions per edge are stored as an array; the existing `edgeTransitions` field already holds an array, so no structural change is needed -- just the filtering logic changes from "find one by edgeIndex" to "filter all by edgeIndex".

