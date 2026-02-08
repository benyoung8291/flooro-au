

# Fix: Coving Toggle Not Updating Order m2

## Root Cause

The coving `Switch` component sits inside a Radix `CollapsibleTrigger asChild` wrapper. When clicking the switch:
1. The Switch fires `onCheckedChange` to update coving state
2. The CollapsibleTrigger also captures the pointer event and toggles the section open/closed
3. The `onClick={(e) => e.stopPropagation()}` on the Switch only blocks the `click` event, not `onPointerDown` which Radix uses internally

This causes unreliable toggling -- the switch may not actually change state, or it changes then immediately reverts due to event conflicts.

## Fix

### 1. Move Switch Outside CollapsibleTrigger (AccessoriesPanel.tsx)

Restructure the coving section (and all similar accessory sections) so the Switch is **not** a descendant of the `CollapsibleTrigger`. The CollapsibleTrigger should only wrap the label/chevron area, with the Switch sitting alongside but outside the trigger zone.

**Current structure:**
```text
CollapsibleTrigger (asChild)
  div (full row)
    label text
    Switch  <-- inside trigger, events conflict
    ChevronDown
```

**Fixed structure:**
```text
div (full row)
  CollapsibleTrigger (asChild)
    div (label + chevron area)
      label text
      ChevronDown
  Switch  <-- outside trigger, no event conflict
```

This applies to ALL accessory sections that have a Switch inside a CollapsibleTrigger:
- Wall Coving
- Weld Rod
- Smooth Edge / Gripper
- Underlayment
- Adhesive

### 2. Verify Reactivity Chain

Once the switch reliably toggles, the existing reactivity chain will work:
- Switch toggles coving off
- `updateCoving({ enabled: false })` fires
- `onUpdateRoom(roomId, { accessories })` propagates to ProjectEditor
- `rooms` state updates, triggering `stripPlans` useMemo recalculation
- `covingHeightMm = 0` produces shorter strip lengths
- `getOrderAreaM2()` reads new `stripPlan.totalMaterialAreaM2` (reduced value)
- Collapsed tile displays updated order m2

No changes needed in the calculation engine -- the bug is purely a UI event handling issue.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/editor/AccessoriesPanel.tsx` | Restructure all accessory section headers so Switch is outside CollapsibleTrigger |

## Scope

This is a targeted fix -- only the AccessoriesPanel layout needs restructuring. The calculation logic in `greedyStrip.ts`, `calculations.ts`, and the display logic in `TakeoffPanel.tsx` are all correct and will work once the switch properly toggles.

