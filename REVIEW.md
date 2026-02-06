# Flooro App - Comprehensive Review

## Executive Summary

Flooro is a React/TypeScript floor covering takeoff application built with Vite, Supabase, and HTML5 Canvas. It targets floor covering contractors and retailers who need to measure floor plans and generate material takeoff lists. The app has a solid foundation -- good tech stack choices, clean component organization, and the bones of a capable measurement tool -- but it currently has **significant bugs that break core workflows**, **calculation engines that produce incorrect results for non-rectangular rooms**, and **UX gaps that prevent professional use**.

The most critical gap vs. commercial tools like MeasureSquare is the **roll goods / drop calculation workflow**. The strip planner operates on bounding boxes rather than actual room polygons, seam editing is broken in key UI paths, cross-room optimization is display-only, and there is no way for users to interactively control drop arrangement and seam placement in the way that professionals need.

Below is a prioritized breakdown of every issue found, organized by severity and category.

---

## Table of Contents

1. [Critical Bugs (Must Fix)](#1-critical-bugs)
2. [Roll Goods / Drop Calculation Issues](#2-roll-goods--drop-calculation-issues)
3. [Tile Calculation Issues](#3-tile-calculation-issues)
4. [Takeoff / Report Calculation Issues](#4-takeoff--report-calculation-issues)
5. [Canvas & Drawing Bugs](#5-canvas--drawing-bugs)
6. [UX Issues](#6-ux-issues)
7. [Performance Issues](#7-performance-issues)
8. [Missing Features vs. Commercial Tools](#8-missing-features-vs-commercial-tools)
9. [Code Quality & Architecture](#9-code-quality--architecture)
10. [Recommendations & Roadmap](#10-recommendations--roadmap)

---

## 1. Critical Bugs

These bugs break core functionality and will cause incorrect results or data loss.

### BUG-001: Multi-page mode is broken throughout ProjectEditor

**Files:** `src/pages/ProjectEditor.tsx` lines 340-382, 654-667
**Impact:** All multi-page projects have broken keyboard navigation, fill direction rotation, and bulk material assignment.

Multiple handlers read from `localData.rooms` (the legacy root-level array) instead of the page-aware `rooms` derived from `localData.pages[activePageId].rooms`:

- `handleNavigatePrevRoom` / `handleNavigateNextRoom` (lines 340-356): `[` and `]` navigation silently does nothing on multi-page projects
- Fill direction rotation via `r` key (lines 371-382): writes to `prev.rooms` (root level), losing the change
- `handleBulkAssignMaterial` (lines 654-667): reads `prev.rooms as Room[]` -- bulk assignment fails silently for multi-page projects

### BUG-002: Duplicate keyboard shortcut for 'r' key

**File:** `src/pages/ProjectEditor.tsx` lines 149 vs 367-384
**Impact:** Pressing `r` simultaneously activates rectangle tool AND rotates fill direction.

Two `useEffect` hooks both bind the `r` key. If a room is selected, both fire: the tool switches to rectangle AND the fill direction rotates.

### BUG-003: Ctrl+S has stale closure

**File:** `src/pages/ProjectEditor.tsx` line 186
**Impact:** Ctrl+S may save stale data or skip saving entirely.

The keyboard shortcut `useEffect` has an empty dependency array `[]`. The `handleSave` function captured in the closure always sees the initial state of `localData` and `hasUnsavedChanges`.

### BUG-004: `onRecalculate` is a no-op in RoomDetailView

**File:** `src/components/editor/RoomDetailView.tsx` line 337
**Impact:** Seam edits in the room detail view never update the strip plan. The seam diagram shows stale data.

```tsx
onRecalculate={() => {}}
```

This is the single most critical workflow bug for the seam/drop editing experience. Users adjust seam positions and see no change.

### BUG-005: Cross-room optimization is display-only

**File:** `src/components/reports/ReportTab.tsx` line 304
**Impact:** Users click "Apply Optimization" and see a success toast, but nothing actually changes.

```tsx
const handleApplyOptimization = (plan: any) => {
  console.log('Applied optimization:', plan);
  toast({ title: 'Optimization applied' });
};
```

The optimization result is logged to console and never persisted to state. The cost savings shown are never reflected in the actual report.

### BUG-006: `rollGoodsPlans` Map is always empty in report generation

**File:** `src/lib/reports/calculations.ts` lines 317, 365
**Impact:** Any consumer expecting cross-room roll optimization data gets an empty Map.

The map is created and returned but never populated. Each room's roll calculation is done independently.

### BUG-007: Room `fillDirection` and `seamOptions` are ignored in calculations

**File:** `src/lib/reports/calculations.ts` line 163
**Impact:** The strip plan always uses default direction (0°) regardless of what the user set on the room. Manual seam placements, avoid zones, and first-seam offsets are all ignored.

```tsx
stripPlan = calculateStripPlan(room, rollSpecs, scale);
// Never passes room.fillDirection or room.seamOptions as options
```

### BUG-008: Merge/split operations create 4 undo steps instead of 1

**File:** `src/components/editor/EditorCanvas.tsx` lines 464-467
**Impact:** Users must press Ctrl+Z four times to undo a single merge or split operation.

```tsx
dispatch({ type: 'DELETE_ROOM', roomId: room1.id });
dispatch({ type: 'DELETE_ROOM', roomId: room2.id });
dispatch({ type: 'ADD_ROOM', room: mergedRoom });
dispatch({ type: 'SELECT_ROOM', roomId: mergedRoom.id });
```

### BUG-009: `setSnapSettings` callback form breaks when parent provides handler

**File:** `src/components/editor/EditorCanvas.tsx` line 379
**Impact:** Grid/vertex/axis snap toggles via keyboard shortcuts silently fail or pass a function as the settings value.

```tsx
setSnapSettings(prev => ({ ...prev, gridEnabled: !prev.gridEnabled }));
```

When `onSnapSettingsChange` is provided, `setSnapSettings` is assigned to it (signature `(settings: SnapSettings) => void`), but this code passes a callback function to it.

### BUG-010: Space bar permanently activates pan tool

**File:** `src/components/editor/EditorCanvas.tsx` line 161
**Impact:** User presses space, enters pan mode, and has no way to return to the previous tool without manually clicking another tool.

Pan activates on `keydown` but there is no `keyup` handler to restore the previous tool.

### BUG-011: No unsaved-changes guard on navigation

**File:** `src/pages/ProjectEditor.tsx` line 814
**Impact:** Users can lose all their work by clicking the back button or navigating away.

The back button calls `navigate('/dashboard')` without checking `hasUnsavedChanges`. There is no `beforeunload` handler.

---

## 2. Roll Goods / Drop Calculation Issues

This is the most critical area for differentiating Flooro from basic takeoff tools. The current implementation has fundamental problems.

### ROLL-001: Strip plan uses bounding box, not actual room polygon

**File:** `src/lib/rollGoods/greedyStrip.ts` (entire function)
**Impact:** For L-shaped, T-shaped, or any non-rectangular room, strips cover empty space outside the polygon. Waste is dramatically overstated and material quantities are wrong.

The algorithm computes the room's bounding box and generates strips to fill the entire rectangle. There is no polygon clipping. A 20m² L-shaped room with a 35m² bounding box will be costed for ~35m² of material.

### ROLL-002: Pattern offset calculation is wrong

**File:** `src/lib/rollGoods/greedyStrip.ts` lines 240-245
**Impact:** Pattern-matched materials (patterned carpet, patterned vinyl) will have incorrect waste calculations.

The pattern offset for each strip is accumulated based on strip *length*, but pattern matching is about aligning the pattern *across strips at the seam*. The offset waste is never added to the strip's length, so the total material requirement is underestimated for patterned materials.

### ROLL-003: Seam avoidance logic is defined but never implemented

**File:** `src/lib/rollGoods/greedyStrip.ts`
**Impact:** `StripPlanOptions` defines `avoidSeamZones` and `manualSeams`, but `calculateStripPlan` never reads or uses them.

Users can set seam preferences in the UI (SeamEditor component) but these preferences have zero effect on the actual calculation.

### ROLL-004: No room-shape-aware strip clipping

**Impact:** Individual strips are not clipped to the room polygon. The cut plan cannot show what each strip actually looks like when installed.

Commercial tools intersect each strip rectangle with the room polygon to determine the exact cut shape, including notches around columns, bay windows, etc.

### ROLL-005: Holes and cutouts are completely ignored

**Impact:** Material covering columns, fixtures, island benches etc. is still counted as needed material.

The room `holes` array is never consulted by the strip planner.

### ROLL-006: `maxStripLength` caps instead of splitting

**File:** `src/lib/rollGoods/greedyStrip.ts` line 231
**Impact:** Rooms longer than the maximum strip length are not fully covered. The code comment says "Would need to split into multiple pieces -- for now, just cap it."

### ROLL-007: Optimization direction logic is identical for both strategies

**File:** `src/lib/rollGoods/greedyStrip.ts` lines 161-166
**Impact:** `optimizeFor === 'seams'` and the default both produce the same result. There is no actual waste optimization mode.

### ROLL-008: Drop pattern offset is always 0 in cut optimizer

**File:** `src/lib/rollGoods/cutOptimizer.ts` line 222
**Impact:** Pattern-aware drop matching is broken. Valid matches are rejected and invalid ones accepted.

### ROLL-009: Cut optimizer returns original plans as "optimized" plans

**File:** `src/lib/rollGoods/cutOptimizer.ts` line 405
**Impact:** Any consumer expecting optimized strip positions gets the pre-optimization data.

### ROLL-010: Cost savings from drop reuse never subtracted from total cost

**File:** `src/lib/rollGoods/cutOptimizer.ts` line 396
**Impact:** `totalCost` overstates the actual cost. `costSaved` is calculated but not applied.

### ROLL-011: No width-based drop tracking

**Impact:** When a partial-width strip is cut from a roll, the remaining width is not tracked as a reusable drop. Only length-based drops are managed.

### ROLL-012: Seam editor coordinate space mismatch

**File:** `src/components/editor/SeamEditor.tsx` lines 150-171
**Impact:** Mouse position calculations are wrong when the SVG renders at any size other than exactly 320x240 CSS pixels.

The handler uses `getBoundingClientRect()` (CSS pixels) but the SVG viewBox is `0 0 320 240`. No ratio conversion is applied.

### ROLL-013: Seam door-proximity analysis has coordinate mismatch

**File:** `src/components/editor/SeamEditor.tsx` lines 97-132
**Impact:** Door positions are in pixel space, seam positions are in mm space. Proximity warnings are unreliable.

### ROLL-014: No pile direction / nap enforcement

**Impact:** Carpet has a pile direction that constrains how strips can be rotated. The algorithm does not enforce same-direction laying.

### ROLL-015: No comparison of different roll widths

**Impact:** Some carpet/vinyl comes in multiple widths (e.g., 3.66m and 4.0m). The algorithm cannot compare which width is more efficient.

---

## 3. Tile Calculation Issues

### TILE-001: All tile patterns treat rooms as rectangles

**File:** `src/lib/tiles/patternCalculator.ts`
**Impact:** For non-rectangular rooms, tiles outside the polygon but inside the bounding box are counted and costed. Waste is inflated.

Every pattern function clips tiles against the bounding box, never against the actual room polygon.

### TILE-002: Herringbone pattern geometry is incorrect

**File:** `src/lib/tiles/patternCalculator.ts` lines 264-275
**Impact:** The pattern produced is not a true herringbone. It's a stacked pattern with alternating orientations.

The repeating unit of 4 tiles has wrong offsets -- the first two tiles are both horizontal, the second two are both vertical, rather than the interlocking V-pattern of true herringbone.

### TILE-003: Brick/thirds offset only alternates between 2 positions

**File:** `src/lib/tiles/patternCalculator.ts` line 195
**Impact:** A 1/3 offset pattern should have 3 distinct row offsets (0, 1/3, 2/3). The current implementation only alternates between 0 and 1/3.

### TILE-004: Diagonal pattern area calculation is wrong

**File:** `src/lib/tiles/patternCalculator.ts` line 373
**Impact:** `usedArea = clippedWidth * clippedHeight * 0.5` is incorrect for most cut tiles. Waste calculations for diagonal patterns are unreliable.

### TILE-005: Basketweave pattern falls through to grid

**File:** `src/lib/tiles/patternCalculator.ts` line 429
**Impact:** Users selecting "basketweave" silently get a grid pattern.

### TILE-006: No grout calculations for non-grid patterns

**Impact:** `groutLinearM` and `groutAreaM2` are zero for brick, herringbone, and diagonal patterns because grout lines are only generated in `calculateGridPattern`.

### TILE-007: No tile cut-reuse optimization

**Impact:** Every edge-cut tile is counted as requiring a full new tile. In reality, matching cuts from opposite edges can often share a tile. This inflates tile counts by 10-30% for typical rooms.

### TILE-008: No balanced-cut calculation

**Impact:** No logic to shift tile starting position to avoid thin slivers at room edges. A 10mm sliver at one edge should be redistributed to create two ~160mm cuts at each edge.

---

## 4. Takeoff / Report Calculation Issues

### CALC-001: Roll goods waste override is not passed through

**File:** `src/lib/reports/calculations.ts` lines 162-163
**Impact:** Even if the user overrides waste for a roll material, it has no effect. The material's default waste is always used.

### CALC-002: Linear material quantity stored in `grossAreaM2` field

**File:** `src/lib/reports/calculations.ts` lines 246-249
**Impact:** Linear meter quantities are added to square meter area totals in the report summary, corrupting the total area figure.

### CALC-003: Weighted average waste calculation uses already-updated denominator

**File:** `src/lib/reports/calculations.ts` lines 329-334
**Impact:** The weighted average waste percent per material across rooms is wrong because `existing.totalArea` is updated before the weighted average formula uses it.

### CALC-004: Tile pricing uses pricePerM2 as pricePerTile

**File:** `src/lib/reports/calculations.ts` lines 238-239
**Impact:** When a tile material only has `pricePerM2` (not `pricePerTile`), the formula `tileCount * pricePerM2` is nonsensical.

### CALC-005: Currency hardcoded to USD

**File:** `src/lib/reports/calculations.ts` line 375
**Impact:** Australian users see USD formatting. Should be AUD.

### CALC-006: Accessory costs never calculated

**Impact:** The `Room` type defines accessories (coving, weld rod, smooth edge, underlayment, adhesive, transitions) with pricing, but none appear in the takeoff report.

### CALC-007: `calculatePerimeter` ignores edge curves

**File:** `src/lib/canvas/geometry.ts` line 147
**Impact:** Rooms with curved walls have underestimated perimeters, producing incorrect quantities for linear materials.

### CALC-008: Waste calculator ignores material type and tile pattern

**File:** `src/lib/reports/wasteCalculator.ts`
**Impact:** Identical waste suggestions regardless of whether the material is carpet, tile, or baseboard. Diagonal tile patterns (15-20% waste) get the same suggestion as grid patterns (5-10%).

---

## 5. Canvas & Drawing Bugs

### CANVAS-001: No HiDPI / Retina support

**File:** `src/components/editor/CanvasRenderer.tsx` lines 169-172
**Impact:** Canvas is blurry on Retina/HiDPI displays (MacBooks, modern phones). Everything renders at 1x when it should use `window.devicePixelRatio`.

### CANVAS-002: Room label centroid is wrong for concave polygons

**File:** `src/components/editor/CanvasRenderer.tsx` lines 888-889
**Impact:** For L-shaped, T-shaped, or U-shaped rooms, the label (name + area) is drawn outside the room's visible area because the arithmetic mean of vertices is not inside the polygon.

### CANVAS-003: Canvas background is hardcoded light-mode

**File:** `src/components/editor/CanvasRenderer.tsx` line 175
**Impact:** In dark mode, the canvas remains light, creating a jarring visual mismatch.

### CANVAS-004: Dimension labels always on the same side of walls

**File:** `src/components/editor/CanvasRenderer.tsx` lines 1003-1007
**Impact:** Labels can overlap room fills or be drawn inside adjacent rooms. Professional tools place labels outside the polygon based on winding direction.

### CANVAS-005: Area display always in m² regardless of imperial unit setting

**File:** `src/components/editor/CanvasRenderer.tsx` line 895
**Impact:** Users who set imperial units see feet/inches on walls but m² for area.

### CANVAS-006: Polygon close distance is in canvas coords, not screen coords

**File:** `src/components/editor/EditorCanvas.tsx` line 624
**Impact:** At low zoom, the 15px close zone is only 2-3 screen pixels (impossible to click). At high zoom, it's 50+ pixels (too easy to accidentally close).

### CANVAS-007: Door placement hit tolerance ignores zoom

**File:** `src/components/editor/EditorCanvas.tsx` line 764
**Impact:** Fixed 20px tolerance in canvas coordinates makes door placement inconsistently precise at different zoom levels.

### CANVAS-008: Pointer capture not used for drag operations

**File:** `src/components/editor/EditorCanvas.tsx`
**Impact:** If the pointer leaves the canvas during a vertex drag, the drag is lost. Professional drawing tools use `setPointerCapture`.

### CANVAS-009: Wall hit detection ignores curved edges

**File:** `src/hooks/useCanvasEditing.ts` line 125
**Impact:** Curved walls cannot be clicked/selected for splitting, door placement, or hole creation because hit detection uses straight-line distance.

### CANVAS-010: Vertex drag does not update curve control points

**File:** `src/hooks/useCanvasEditing.ts` lines 301-371
**Impact:** Dragging a vertex endpoint of a curved edge distorts the curve because the control point stays fixed.

### CANVAS-011: No snap-to-grid during vertex drag

**File:** `src/hooks/useCanvasEditing.ts`
**Impact:** Grid snapping only works during drawing, not when editing existing vertices.

### CANVAS-012: Duplicate `isPointInPolygon` function

**File:** `src/components/editor/CanvasRenderer.tsx` lines 1154-1166
**Impact:** If the canonical version in `geometry.ts` is updated (e.g., for curved polygon support), the duplicate won't get the fix.

### CANVAS-013: Image cache grows without bound

**File:** `src/components/editor/CanvasRenderer.tsx` line 53
**Impact:** Memory leak -- every background image URL ever loaded stays in memory forever.

---

## 6. UX Issues

### UX-001: Scale calibration uses `window.prompt()`

**File:** `src/components/editor/EditorCanvas.tsx` line 797
**Impact:** A blocking browser dialog that cannot be styled, breaks visual flow, and looks unprofessional. The code comment says "simplified - in production, use a modal."

### UX-002: No confirmation before deleting rooms or pages

**Files:** `src/pages/ProjectEditor.tsx` lines 432-464, 704-721
**Impact:** Instant, irreversible deletion of potentially hours of work with a single click.

### UX-003: Share Project menu item does nothing

**File:** `src/pages/ProjectEditor.tsx` line 916
**Impact:** No `onClick` handler. Users click and nothing happens.

### UX-004: Viewer role has no visual indication

**Impact:** Viewers can draw, edit, and modify rooms -- the changes just silently don't save. No banner or indicator tells the viewer they're in read-only mode.

### UX-005: Page tabs hidden on mobile

**File:** `src/pages/ProjectEditor.tsx` line 927
**Impact:** Mobile users on multi-page projects cannot switch between pages at all.

### UX-006: Rectangle tool shows no preview while placing

**File:** `src/components/editor/EditorCanvas.tsx` lines 667-718
**Impact:** After the first click, there's no visual preview rectangle following the cursor. Users place rooms blind.

### UX-007: No visual indicator for polygon close zone

**Impact:** When drawing a room, the start vertex is green but there's no visual indication of the 15px close radius. Users must guess.

### UX-008: Room labels overlap for adjacent/small rooms

**File:** `src/components/editor/CanvasRenderer.tsx`
**Impact:** No collision detection for room labels. Text becomes unreadable when rooms are small or adjacent.

### UX-009: Dimension labels shown at all zoom levels

**Impact:** Even when zoomed way out on a complex plan, every wall gets a dimension label, creating unreadable visual clutter.

### UX-010: Sidebar has 6 icon-only tabs with no text labels

**File:** `src/components/editor/EditorSidebar.tsx` line 225
**Impact:** Users must hover each icon to learn what it does. The icons are not universally recognizable.

### UX-011: Material selector is a flat list with no search

**File:** `src/components/editor/TakeoffPanel.tsx` lines 351-415
**Impact:** For projects with dozens of materials, the dropdown is unusable. No search, filter, or grouping.

### UX-012: Currency hardcoded to `$`

**File:** `src/components/editor/TakeoffPanel.tsx` line 272
**Impact:** Australian users expect AUD formatting.

### UX-013: Total area rounded to 0 decimal places

**File:** `src/components/editor/TakeoffPanel.tsx` line 264
**Impact:** A project of 2.3 m² shows "2 m² Total." Per-room areas show 1 decimal -- inconsistent.

### UX-014: Fill direction rotates by 45° for all material types

**File:** `src/components/editor/TakeoffPanel.tsx` lines 179-183
**Impact:** For roll goods, only 0° and 90° are meaningful. Users must click through 8 positions to cycle back to 0°.

### UX-015: Tab state not reset when material type changes

**File:** `src/components/editor/RoomDetailView.tsx`
**Impact:** If `activeTab === 'seams'` and the material changes from roll to tile, the seams tab disappears but `activeTab` remains `'seams'`, showing a blank panel.

### UX-016: Seam editor SVG is small with no zoom/pan

**File:** `src/components/editor/SeamEditor.tsx`
**Impact:** The 320x240 SVG diagram is too small for precise seam placement. No zoom, pan, or full-screen.

### UX-017: First-seam-offset slider has 50mm steps only

**File:** `src/components/editor/SeamEditor.tsx` lines 494-503
**Impact:** Too coarse for precise control, with no numeric input alternative.

### UX-018: No right-click context menu

**Impact:** Professional CAD/drawing tools universally support right-click for delete, properties, copy, etc.

### UX-019: No multi-select for rooms

**Impact:** No way to select multiple rooms for bulk operations.

### UX-020: No undo feedback

**Impact:** Undo/redo provides no visual feedback telling the user what was undone.

### UX-021: "Export PDF" button actually opens browser print dialog

**File:** `src/components/reports/CutPlanModal.tsx` line 349
**Impact:** Misleading button label. `handlePrint` calls `window.print()`, not a PDF export.

### UX-022: Undo reverts viewport position (zoom/pan)

**File:** `src/hooks/useCanvasHistory.ts` line 96
**Impact:** Undoing a room addition also reverts any panning/zooming done since then. Extremely disruptive.

### UX-023: Toolbar overflow on smaller screens

**File:** `src/components/editor/EditorToolbar.tsx`
**Impact:** 18+ buttons with no wrapping, scrolling, or overflow menu on narrow screens.

### UX-024: Grid size options are metric-only even with imperial selected

**File:** `src/components/editor/EditorToolbar.tsx` lines 82-94
**Impact:** Grid shows 50mm, 100mm etc. when user has selected imperial units.

### UX-025: Door widths are US-standard only

**File:** `src/lib/canvas/types.ts` lines 205-209
**Impact:** For an Australian app, standard door widths should include metric sizes (620mm, 720mm, 820mm, 870mm, 920mm).

---

## 7. Performance Issues

### PERF-001: Full canvas redraw on every state change

**File:** `src/components/editor/CanvasRenderer.tsx` lines 405-407
**Impact:** No dirty-region tracking, no layer separation, no offscreen buffering for static elements like the grid and background image.

### PERF-002: No `requestAnimationFrame` throttling for pointer move

**File:** `src/components/editor/EditorCanvas.tsx` lines 904-1024
**Impact:** Every pixel of mouse movement triggers multiple state updates, each causing a full re-render.

### PERF-003: `handlePointerMove` runs point-in-polygon for every room on every move

**File:** `src/components/editor/EditorCanvas.tsx` lines 938-945
**Impact:** O(rooms × vertices) per mouse event with no spatial indexing.

### PERF-004: `JSON.stringify` for change detection on every update

**File:** `src/components/editor/EditorCanvas.tsx` line 287
**Impact:** Entire state serialized to JSON on every room/scale change.

### PERF-005: `new Map()` created on every render

**File:** `src/pages/ProjectEditor.tsx` line 993
**Impact:** `materialTypes={new Map(...)}` forces child component re-render even when materials haven't changed.

### PERF-006: Shared edge detection computed in both EditorCanvas AND CanvasRenderer

**Impact:** O(n²) computation duplicated in two components on every room change.

### PERF-007: Grid draws individual dots/circles at every intersection

**File:** `src/components/editor/CanvasRenderer.tsx` lines 1297-1305
**Impact:** Thousands of `arc()` calls at high zoom with small grid sizes.

### PERF-008: Grid lines drawn as individual paths

**File:** `src/components/editor/CanvasRenderer.tsx` lines 578-595
**Impact:** Each grid line is a separate `beginPath()`/`stroke()`. Should batch into a single path.

### PERF-009: Undo history stores full state snapshots

**File:** `src/hooks/useCanvasHistory.ts`
**Impact:** 50 full copies of the entire project state. No structural sharing or diffing.

### PERF-010: No drag debouncing for undo history

**Impact:** Dragging a vertex creates a history entry for every intermediate position, filling the 50-entry history with micro-moves.

---

## 8. Missing Features vs. Commercial Tools

### Category: Roll Goods / Sheet Materials

| Feature | MeasureSquare | Flooro | Gap |
|---------|:---:|:---:|-----|
| Polygon-aware strip clipping | Yes | No | Strips are bounding-box only |
| Interactive seam drag on canvas | Yes | Partial | Seam editor is a separate small SVG, not on the main canvas |
| Different roll widths comparison | Yes | No | Single width per material only |
| Cross-seam / T-joint planning | Yes | No | Only primary seams between strips |
| Pile direction enforcement | Yes | No | No nap/pile direction concept |
| Seam in doorway warnings | Yes | Partial | Coordinate space bugs make warnings unreliable |
| Drop/offcut inventory | Yes | Partial | Drops tracked but optimization is display-only |
| Pattern drop calculation | Yes | Buggy | Pattern offset accumulation is wrong |
| Interactive drop arrangement | Yes | No | No way for users to rearrange drops |
| Roll-to-room assignment | Yes | No | No tracking of which physical roll serves which strip |
| Stair takeoff | Yes | No | Completely absent |

### Category: Tile / Modular Materials

| Feature | MeasureSquare | Flooro | Gap |
|---------|:---:|:---:|-----|
| Polygon-aware tile clipping | Yes | No | Bounding box only |
| Correct herringbone pattern | Yes | No | Pattern geometry is wrong |
| Basketweave pattern | Yes | No | Falls through to grid silently |
| Balanced edge cuts | Yes | No | Thin slivers not redistributed |
| Cut-reuse optimization | Yes | No | Every cut tile = new full tile |
| Grout quantity estimation | Yes | Partial | Only grid pattern has grout lines |
| Multi-size tile patterns (Versailles) | Yes | No | Single tile size only |

### Category: General Measurement

| Feature | MeasureSquare | Flooro | Gap |
|---------|:---:|:---:|-----|
| Accessory takeoff in reports | Yes | No | Defined but never calculated |
| Labour costing in reports | Yes | No | `calculations.ts` defined but not used |
| Tax/GST calculation | Yes | No | Critical for Australian quotes |
| Markup/margin on quotes | Yes | No | No installer margin support |
| CSV/Excel export | Yes | No | PDF only |
| Multi-select rooms | Yes | No | Single selection only |
| Snap-to-edge for shared walls | Yes | No | Only vertex snap, not edge snap |
| Measurement tool (without room) | Yes | No | Must draw a room to see any measurement |
| Room copy/paste | Yes | No | No clipboard operations |
| Right-click context menu | Yes | No | No context menu |

---

## 9. Code Quality & Architecture

### ARCH-001: ProjectEditor.tsx is 1177 lines with 25+ state variables

This single component manages tool state, page state, save state, dialog state, material state, and all keyboard shortcuts. It should be decomposed into:
- `useEditorPages` hook for page management
- `useEditorSave` hook for auto-save and manual save
- `useEditorKeyboardShortcuts` hook for all keyboard bindings
- `useEditorDialogs` hook for dialog open/close state

### ARCH-002: Repeated multi-page/legacy branching

The pattern `if (pages.length > 0 && activePageId)` vs legacy mode appears 8+ times. This should be abstracted -- or better, force migration on load so legacy mode is never encountered at runtime.

### ARCH-003: Material property naming is inconsistent

`widthMm`, `rollWidthMm`, and `width` are all used in different files to mean the same thing. This causes silent fallback to default values (3660mm or 4000mm), producing incorrect calculations. Files affected:
- `EditorSidebar.tsx` line 449: `specs?.rollWidthMm`
- `CutPlanModal.tsx` line 353: `specs?.width`
- `ReportTab.tsx` line 353: `specs?.width`

### ARCH-004: `any` types throughout

Multiple uses of `as any` for `json_data`, `specs`, material type casting. These defeat TypeScript's safety.

### ARCH-005: No consistent coordinate space management

Pixel space (room points), mm space (strip plans, seam positions), and SVG viewBox space (seam editor) are mixed throughout. There should be a single transformation utility used everywhere.

### ARCH-006: Two toast systems

Both `@radix-ui/react-toast` (Toaster) and `sonner` (Sonner) are mounted in App.tsx. Only one should be used.

### ARCH-007: Missing TakeoffPanel material lookup misses project materials

**File:** `src/components/editor/TakeoffPanel.tsx` line 104-129 and `RoomDetailView.tsx` line 69
The `totals` calculation and room detail view only search library materials, not project-specific materials. Rooms using project-only materials show no material in the detail view.

---

## 10. Recommendations & Roadmap

### Phase 1: Fix Critical Bugs (Foundation)

1. **Fix multi-page mode** -- All handlers must use page-aware rooms
2. **Fix keyboard shortcut conflicts** -- Deduplicate `r` key, add proper event consumption
3. **Fix Ctrl+S stale closure** -- Add proper dependency array
4. **Fix `onRecalculate`** -- Wire up strip plan recalculation in RoomDetailView
5. **Fix cross-room optimization** -- Actually persist and apply optimization results
6. **Add unsaved-changes guard** -- `beforeunload` handler + navigation prompt
7. **Fix undo batching** -- Group merge/split into atomic operations
8. **Fix space bar pan** -- Restore previous tool on keyup
9. **Fix HiDPI rendering** -- Use `devicePixelRatio` for canvas sizing
10. **Fix currency** -- Use AUD, make configurable

### Phase 2: Fix Calculation Engines (Correctness)

1. **Implement polygon-aware strip clipping** -- Each strip must be intersected with the room polygon
2. **Pass `fillDirection` and `seamOptions` through to strip plan calculation**
3. **Fix pattern offset calculation** -- Add alignment waste to strip lengths
4. **Fix tile patterns** -- Correct herringbone geometry, implement basketweave, fix brick thirds
5. **Implement polygon-aware tile clipping** -- Test tiles against room polygon, not bounding box
6. **Fix linear material `grossAreaM2` field corruption**
7. **Fix weighted average waste calculation**
8. **Fix report material pricing by type**
9. **Add accessory calculations to reports**
10. **Wire up waste calculator with material type and tile pattern**

### Phase 3: Professional Seam/Drop Workflow (Differentiator)

This is the key area that separates a basic takeoff tool from a professional one:

1. **Interactive seam placement on the main canvas** -- Users should be able to drag seam lines directly on the floor plan, seeing exactly how strips align with the room shape
2. **Fill direction rotation on canvas** -- Visual arrow showing direction, click to rotate
3. **Strip-by-strip visualization** -- Each strip shown in a different shade, with actual polygon-clipped shapes
4. **Seam-to-room-feature snapping** -- Seams snap to doors, walls, and avoid zones
5. **Drop/offcut panel** -- Visual inventory of available drops with drag-to-assign
6. **Multi-width comparison** -- Show side-by-side plans for 3.66m vs 4.0m rolls
7. **Cross-seam planning** -- For rooms longer than the roll, show where length joints fall
8. **Physical roll tracking** -- Which roll number each strip comes from
9. **Pile direction indicator** -- Arrow showing nap direction, enforced across all strips
10. **Stair takeoff calculator** -- Dedicated tool for carpet/LVP stair calculations

### Phase 4: UX Polish (World-Class)

1. **Replace `window.prompt()` with styled modal** for scale calibration
2. **Add confirmation dialogs** for destructive actions (delete room, delete page)
3. **Rectangle preview** while placing
4. **Polygon close zone indicator** -- Dashed circle showing snap radius
5. **Smart dimension label placement** -- Hide at low zoom, avoid overlaps, use winding for outside placement
6. **Room label collision avoidance**
7. **Right-click context menu** for all selectable elements
8. **Multi-select** with Shift+click and marquee selection
9. **Proper dark mode canvas**
10. **Tab sidebar with text labels** or persistent tooltips
11. **Material search/filter** in assignment dropdown
12. **Undo labels** -- "Undo: Delete Room" toast
13. **Viewer role banner** -- Clear indication when in read-only mode
14. **Mobile page tab access**
15. **Touch-optimized seam editing**

### Phase 5: Performance (Scale)

1. **Layer-based canvas rendering** -- Static layer (grid, background), room layer, interaction layer
2. **requestAnimationFrame throttling** for pointer events
3. **Spatial index** (quadtree) for point-in-polygon and hit detection
4. **Structural sharing** in undo history (store diffs, not full snapshots)
5. **Drag batching** for undo (one entry per drag, not per pixel)
6. **Memoize** `materialTypes` map and shared edge computation
7. **Image cache eviction** -- LRU with size limit

---

## Comparison Summary: Flooro vs MeasureSquare

| Aspect | MeasureSquare | Flooro Current | Flooro Potential |
|--------|:---:|:---:|:---:|
| Floor plan drawing | Excellent | Good | Excellent (with fixes) |
| Scale calibration | Modal + visual | `window.prompt()` | Easy fix |
| Square meter takeoff | Excellent | Good (bugs) | Excellent (with fixes) |
| Roll goods drops/seams | Excellent | Broken | Excellent (needs Phase 3) |
| Tile patterns | Excellent | Buggy | Good (with fixes) |
| Interactive seam placement | On-canvas | Small separate SVG | Needs major work |
| Cross-room optimization | Yes | Display-only | Needs wiring up |
| Accessory takeoff | Yes | Types defined, not calculated | Medium effort |
| Report/PDF export | Professional | Basic HTML print | Medium effort |
| Mobile support | Native app | Responsive web (gaps) | Good foundation |
| 3D visualization | No | Yes (Three.js) | Unique advantage |

**Bottom line:** Flooro has an excellent technical foundation and a unique advantage with 3D visualization. The core drawing tools are solid. But the calculation engines have fundamental correctness issues (bounding-box-only, wrong pattern math, broken seam workflow), and the roll goods/drop workflow -- the most important differentiator for professional users -- needs a ground-up rethink of how users interact with seam placement. With the phased fixes above, Flooro can reach parity with and then exceed MeasureSquare, especially given its modern web stack, 3D capabilities, and potential for real-time collaboration via Supabase.
