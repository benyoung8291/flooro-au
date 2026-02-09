

# Fix Canvas Blue Wash and Performance When Zooming Out

## Root Cause

Two rendering functions draw grid lines with a **fixed world-space spacing** regardless of zoom level. When zooming out, the visible area in world coordinates grows dramatically, causing thousands or tens of thousands of grid lines to be drawn per frame.

- `drawGrid()` uses a fixed 50px spacing -- at zoom 0.1 on a 1920px viewport, it draws ~384 vertical lines and ~216 horizontal lines = ~600 line draw calls per frame (minor + major)
- `drawSnapGrid()` draws lines **and** individual dots at each intersection -- the dots alone can be 384 x 216 = ~83,000 arc draw calls

The grid lines are blue-tinted (`hsl(214 32% 91%)`), and when densely packed they visually blend into a solid blue overlay.

---

## Solution: Adaptive Grid Density

### 1. Adaptive spacing in `drawGrid()`

**File**: `src/components/editor/CanvasRenderer.tsx`, function `drawGrid` (line 809-865)

Instead of a fixed 50px world-space grid, calculate the grid spacing so that lines are always ~50px apart **on screen**:

```
adaptiveGridSize = 50 / zoom
```

Then round up to a "nice" number (50, 100, 200, 500, 1000...) so the grid looks clean. This ensures a maximum of ~40-50 grid lines per axis regardless of zoom level.

Also add a maximum line count safeguard: if the calculated number of lines exceeds ~200, skip drawing the grid entirely (the lines would be too dense to be useful anyway).

### 2. Cap grid density in `drawSnapGrid()`

**File**: `src/components/editor/CanvasRenderer.tsx`, function `drawSnapGrid` (line 1631-1686)

- Add a check: if the number of grid cells visible exceeds a threshold (e.g., 100 lines per axis), skip the grid entirely
- Remove the intersection dots loop entirely when cell count is high -- the dots are invisible at low zoom anyway
- Add a density check before the dot-drawing nested loop: skip dots if there would be more than ~2500 (50x50)

### 3. Fade grid opacity at extreme zoom levels

For the default grid, reduce the stroke alpha when zoom is very low so even if a few lines render, they don't dominate the view:

```
const gridAlpha = Math.min(1, zoom * 2);  // fades below zoom 0.5
ctx.globalAlpha = gridAlpha;
```

---

## Technical Details

### Changes to `drawGrid` (lines 809-865)

Replace the fixed `gridSize = 50` with adaptive sizing:

```typescript
function drawGrid(ctx, width, height, zoom, offsetX, offsetY) {
  // Adaptive grid: keep ~50px screen spacing
  const minScreenSpacing = 50;
  const rawSize = minScreenSpacing / zoom;
  
  // Snap to a "nice" number: 50, 100, 200, 500, 1000, 2000, 5000...
  const niceNumbers = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
  let gridSize = niceNumbers[niceNumbers.length - 1];
  for (const n of niceNumbers) {
    if (n >= rawSize) { gridSize = n; break; }
  }
  
  const majorMultiple = 4;
  
  // Calculate visible area
  const startX = Math.floor(-offsetX / zoom / gridSize) * gridSize - gridSize;
  const endX = Math.ceil((width - offsetX) / zoom / gridSize) * gridSize + gridSize;
  const startY = Math.floor(-offsetY / zoom / gridSize) * gridSize - gridSize;
  const endY = Math.ceil((height - offsetY) / zoom / gridSize) * gridSize + gridSize;
  
  // Safety: skip if too many lines
  const lineCountX = (endX - startX) / gridSize;
  const lineCountY = (endY - startY) / gridSize;
  if (lineCountX > 200 || lineCountY > 200) return;
  
  // Fade at low zoom
  const gridAlpha = Math.min(1, zoom * 2.5);
  ctx.globalAlpha = gridAlpha;
  
  // ... draw minor and major lines as before, using adaptive gridSize ...
  
  ctx.globalAlpha = 1;
}
```

### Changes to `drawSnapGrid` (lines 1631-1686)

Add density guards:

```typescript
function drawSnapGrid(ctx, width, height, zoom, offsetX, offsetY, gridSizePx) {
  if (gridSizePx <= 0) return;
  
  // Calculate visible bounds
  const visibleMinX = -offsetX / zoom;
  const visibleMaxX = (width - offsetX) / zoom;
  const visibleMinY = -offsetY / zoom;
  const visibleMaxY = (height - offsetY) / zoom;
  
  const startX = Math.floor(visibleMinX / gridSizePx) * gridSizePx;
  const endX = Math.ceil(visibleMaxX / gridSizePx) * gridSizePx;
  const startY = Math.floor(visibleMinY / gridSizePx) * gridSizePx;
  const endY = Math.ceil(visibleMaxY / gridSizePx) * gridSizePx;
  
  // Skip if too dense (lines or dots would be invisible)
  const linesX = (endX - startX) / gridSizePx;
  const linesY = (endY - startY) / gridSizePx;
  if (linesX > 100 || linesY > 100) return;
  
  // ... draw lines ...
  
  // Only draw dots if reasonable count
  if (linesX * linesY < 2500) {
    // ... draw intersection dots ...
  }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/editor/CanvasRenderer.tsx` | Modify `drawGrid` (~20 lines) and `drawSnapGrid` (~10 lines) to add adaptive spacing and density guards |

No new files needed. No database changes. This is a pure rendering optimization.

## Expected Result

- At normal zoom (0.5 -- 2.0): grid looks identical to current behavior
- At low zoom (0.1 -- 0.3): grid adapts to larger spacing, remains useful without blue wash
- At very low zoom (< 0.1): grid fades out gracefully
- Performance stays at 60fps regardless of zoom level (bounded draw call count)
