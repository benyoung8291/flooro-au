
# On-Canvas Transition Resize Handles

## Problem
When a transition covers 100% of an edge, its start/end points sit right on the room's vertices. Clicking near the edge corner to resize the transition instead grabs and drags the room vertex, since vertex hit-testing runs before any transition handle check. Currently, transitions can only be resized via the sidebar panel's range slider, which is not discoverable.

## Solution
Add visible, draggable handles on the canvas at each transition segment's start and end positions. These handles will be hit-tested **before** vertices, so they take priority when both overlap.

---

## Changes

### 1. CanvasRenderer.tsx -- Draw transition resize handles

When a room is selected, for each transition segment on each edge, draw small diamond-shaped handles at the `startPercent` and `endPercent` positions along the edge. Use an amber/orange color to match the transition styling.

- Only draw handles when the room is selected (same pattern as door resize handles)
- Draw after the transition line segments so handles appear on top
- Diamond shape differentiates them from vertex circles and door resize squares

### 2. EditorCanvas.tsx -- Hit-test and drag transition handles

In `handlePointerDown` (select tool), add a new check **before** `startDrag(point)` that:

1. Iterates through selected room's `edgeTransitions`
2. Calculates the canvas position of each transition's start and end percent points on the edge
3. If the click is within hit radius of a handle, starts a transition resize drag instead of vertex drag

New ref state: `transitionResizeRef` tracking `{ roomId, transitionId/edgeIndex, handle: 'start'|'end', initialPercent }`.

In `handlePointerMove`:
- Project the mouse position onto the edge line to calculate the new percent (0.0-1.0)
- Clamp so start cannot exceed end and vice versa, with a minimum gap of 0.05 (5%)
- Update the room's `edgeTransitions` array in real-time

In `handlePointerUp`:
- Commit the final transition percent values
- Clear the resize state

### 3. useCanvasEditing.ts -- No changes needed

The transition resize is handled directly in EditorCanvas since it's a different interaction model (percent-based) from vertex/wall dragging. This keeps the editing hook focused on geometry.

### 4. Cursor feedback

When hovering over a transition resize handle, show a grab/pointer cursor to indicate it's draggable. The hover detection will be added to `handlePointerMove` in EditorCanvas.

---

## Interaction Priority (pointer down in select mode)

```text
1. Door resize handles    (existing)
2. Transition resize handles  (NEW)
3. Vertex / wall drag     (existing via startDrag)
4. Click-to-select / pan  (existing fallback)
```

This ensures transition handles always win over vertex dragging when they overlap at edge endpoints.

## Visual Design

- Diamond-shaped handles (rotated squares), ~8px, amber fill with white border
- Appear only on the selected room's transition edges
- Subtle size increase on hover for feedback
