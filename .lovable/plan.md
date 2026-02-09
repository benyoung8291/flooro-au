

# Sync Takeoff Measurements to Linked Quotes + Easy Navigation

## Overview

Two capabilities are needed:

1. **Sync**: When room measurements, accessories, or materials change in the project takeoff, automatically update the linked quote's line items to reflect the new quantities and costs.
2. **Navigate**: Provide quick, obvious navigation between the Project Editor (takeoff) and the Quote Editor, so users can jump back and forth without losing context.

---

## Current Architecture

- **Quote generation** (`useGenerateQuoteFromProject`) is a one-shot process: it creates a quote and line items from the current takeoff state, then navigates away. After that, the quote and project are decoupled.
- Each line item has a `source_room_id` field that records which room it came from. Child items also store a `metadata.type` field (`material`, `installation`, `coving`, `weld_rod`, etc.) to identify what they represent.
- The quote stores `project_id` to link back to the source project.
- The TakeoffPanel footer shows either "Generate Quote" or "View Quote" depending on whether a quote already exists for the project.

---

## Part 1: Sync Takeoff to Quote

### Approach: "Sync from Takeoff" Action

Rather than auto-syncing in real-time (which would be confusing if users have manually edited line item prices), this will be a deliberate **"Sync from Takeoff"** action available in the Quote Editor. This gives users control and avoids unexpected changes to custom pricing.

### New hook: `useSyncQuoteFromProject`

**File**: `src/hooks/useSyncQuoteFromProject.ts`

This hook accepts a `quoteId` and performs the sync operation:

1. Load the linked project's `json_data` (rooms, scale, materials, accessories)
2. Load the current quote line items
3. For each room in the takeoff that has a `source_room_id` match in the quote:
   - Recalculate the room's net area and order area from the current geometry
   - Recalculate accessory quantities (coving length, weld rod length, etc.)
   - Match child line items by `source_room_id` + `metadata.type`
   - Update the **quantity** field on each matched line item (keeping user-set prices intact)
   - If the room name changed, update the parent's description
4. Handle new rooms (rooms in takeoff with materials that have no matching parent in the quote) by adding new parent + child groups
5. Flag rooms that exist in the quote but were deleted from the takeoff, letting the user decide to remove them
6. Save all changes and update quote totals

### What syncs (quantities only, prices preserved):

| Line Item Type | Synced Field | Source |
|---------------|-------------|--------|
| Material Supply | `quantity` (order area m2) | Room geometry + waste% + strip plan |
| Installation | `quantity` (net area or 1) | Room geometry |
| Coving | `quantity` (perimeter m) | Room geometry + coving settings |
| Weld Rod | `quantity` (seam length m) | Strip plan seam data |
| Smooth Edge | `quantity` (perimeter m) | Room geometry |
| Underlayment | `quantity` (area m2) | Room geometry |
| Adhesive | `quantity` (units) | Room area / coverage |
| Transitions | `quantity` (count) | Door count |

User-set `cost_price`, `sell_price`, and `margin_percentage` are **never overwritten** during sync. Only quantities change.

### UI: Sync button in Quote Editor

**File**: `src/pages/QuoteEditor.tsx`

When the quote has a `project_id`, show a "Sync from Takeoff" button in the toolbar area (near "Add Item" and "From Price Book"). It will:
- Show a refresh icon with "Sync from Takeoff" label
- On click, run the sync and show a toast summarizing changes (e.g., "Updated quantities for 5 rooms, added 1 new room")
- Show a loading spinner during the sync
- Only visible for quotes linked to a project

---

## Part 2: Easy Navigation Between Quote and Project

### A. From Project Editor to Quote

The TakeoffPanel footer already shows "View Quote" when a quote exists. This will be enhanced:

**File**: `src/pages/ProjectEditor.tsx` (header area)

- The existing "Quotes" button in the header toolbar will be made smarter: if the project has a linked quote, it will navigate directly to that quote instead of the quotes list
- Update the button label to show "View Quote" when a linked quote exists, or "Quotes" when it doesn't
- Keep the progress bar "Quote" step navigating to the linked quote

### B. From Quote Editor to Project

**File**: `src/pages/QuoteEditor.tsx`

When the quote has a `project_id`, show a "View Takeoff" link button in the header bar (next to the quote number/metadata area). This provides a one-click path back to the project editor.

- Small outline button with a Ruler/PenTool icon and "Takeoff" label
- Navigates to `/projects/{project_id}`
- Only shown when `quote.project_id` is not null

### C. From TakeoffPanel to Quote (already works)

The existing "View Quote" / "Generate Quote" button at the bottom of the TakeoffPanel already handles this. No changes needed here.

---

## Technical Details

### Files to create

| File | Purpose |
|------|---------|
| `src/hooks/useSyncQuoteFromProject.ts` | Core sync logic: reads project data, recalculates quantities, updates line items |

### Files to modify

| File | Changes |
|------|---------|
| `src/pages/QuoteEditor.tsx` | Add "Sync from Takeoff" button (when project-linked), add "View Takeoff" navigation button |
| `src/pages/ProjectEditor.tsx` | Enhance header "Quotes" button to navigate directly to the linked quote |
| `src/hooks/useGenerateQuoteFromProject.ts` | Minor: export helper functions (`getAreaM2`, `getOrderAreaM2`, `resolveMaterial`) so they can be reused by the sync hook |

### Sync hook interface

```typescript
interface SyncResult {
  updatedRooms: number;
  addedRooms: number;
  removedRooms: string[];  // room names that are in quote but not in takeoff
  totalItemsUpdated: number;
}

function useSyncQuoteFromProject() {
  syncQuote(quoteId: string): Promise<SyncResult>
  isSyncing: boolean
}
```

### Sync algorithm (pseudocode)

```text
1. Fetch quote (get project_id)
2. Fetch project json_data (get rooms, scale, pages)
3. Fetch current quote line items
4. Fetch materials library

For each room in takeoff with a material assigned:
  a. Find parent line item where source_room_id === room.id
  b. If found:
     - Update parent description if room.name changed
     - For each child line item:
       - Match by source_room_id + metadata.type
       - Recalculate quantity from current geometry
       - Update quantity and line_total (qty * existing sell_price)
  c. If not found (new room):
     - Create new parent + children using same logic as generateQuote

For each parent line item with source_room_id NOT in current rooms:
  - Flag as "orphaned" in the result (let user decide)

Save all changes, update quote totals
```

### Navigation flow

```text
Project Editor                         Quote Editor
+-------------------+                 +-------------------+
| Header:           |                 | Header:           |
| [<-] Project Name |                 | Q-0001  [Draft]   |
|      [View Quote] ----navigate----> | [View Takeoff] ---|
|                   |                 |                   |
| TakeoffPanel:     |                 | Line Items:       |
|   Room 1: 24.5m2  |                 | [Sync from        |
|   Room 2: 18.3m2  |                 |  Takeoff]         |
|   [View Quote] ----navigate----> |                   |
+-------------------+                 +------- | ---------+
                                              |
                                    navigate back
                                              |
                     <------------------------+
```

### Edge cases handled

- **No project linked**: Sync button and "View Takeoff" button are simply not shown
- **Room deleted from takeoff**: Sync reports orphaned rooms but does not auto-delete them (user may have added custom items under that group)
- **New room added to takeoff**: Sync adds a new parent group with material/installation/accessory children using the same margin as the quote's average
- **Material changed on room**: Sync updates the material supply child's description and recalculates quantity based on the new material's specs
- **Manually added line items (no source_room_id)**: Left completely untouched by sync
- **Quote not in draft status**: Sync button disabled with tooltip "Only draft quotes can be synced"

