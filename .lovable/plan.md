

# Price Book, Installation Costs, OOH Allowance, and Waste % Display

## Overview

This adds a **Price Book** system (similar to Materials Library) for storing installation labor rates, sell prices, and sundry items. It also adds per-room installation cost fields, an Out of Hours (OOH) checkbox, and a waste % badge on the collapsed room tile.

---

## Part 1: Price Book Database Table

Create a new `price_book_items` table in the database to store reusable pricing entries per organization. This mirrors the `materials` table pattern (global + org-specific items).

**Columns:**
- `id` (uuid, PK)
- `organization_id` (uuid, FK to organizations, nullable for global items)
- `is_global` (boolean, default false)
- `name` (text) -- e.g., "Sheet Vinyl Installation", "Floor Leveller 20kg bag"
- `category` (text) -- `installation_labor`, `sundry`, `accessory`, `other`
- `pricing_type` (text) -- `per_m2`, `per_linear_m`, `per_unit`, `fixed`, `per_hour`
- `cost_rate` (numeric) -- the cost/buy price
- `sell_rate` (numeric) -- the sell/quote price
- `description` (text, nullable)
- `specs` (jsonb) -- flexible storage for additional data (SKU, supplier, etc.)
- `created_at`, `updated_at` (timestamptz)

**RLS Policies:** Same pattern as `materials` table -- users can view global + own org items, CRUD on own org items only.

---

## Part 2: Price Book Page and Hook

### New Files:
- `src/hooks/usePriceBook.ts` -- CRUD hook following the same pattern as `useMaterials.ts`
- `src/pages/PriceBook.tsx` -- Standalone page at `/price-book` with search, filter by category, card list
- `src/components/pricebook/PriceBookCard.tsx` -- Display card for each item
- `src/components/pricebook/CreatePriceBookItemDialog.tsx` -- Create dialog
- `src/components/pricebook/EditPriceBookItemDialog.tsx` -- Edit dialog

### Route:
Add `/price-book` as a protected route in `App.tsx`.

### Dashboard Link:
Add a "Price Book" button alongside the existing "Materials" button on the Dashboard.

### Categories with example items:

| Category | Examples |
|----------|----------|
| `installation_labor` | Sheet vinyl install $/m2, Carpet tile install $/m2, LVP install $/m2 |
| `sundry` | Floor leveller bag, Adhesive bucket, Primer |
| `accessory` | Stair nose, Scotia/quad, Door bars |
| `other` | Day rate allowance, OOH premium rate, Delivery charge |

---

## Part 3: Per-Room Installation Cost on Room Tile

### Room Type Changes (`src/lib/canvas/types.ts`):

Add to the `Room` interface:
```text
installCost?: {
  type: 'per_m2' | 'fixed';        // m2 rate or flat/day rate
  rate: number;                     // $/m2 or fixed amount
  sellRate?: number;                // sell price (if different from cost)
  priceBookItemId?: string;         // link back to price book item
  oohAllowance?: boolean;           // Out of Hours flag
  oohMultiplier?: number;           // OOH multiplier (default 1.5)
};
```

### TakeoffPanel Changes (`src/components/editor/TakeoffPanel.tsx`):

**On the collapsed room tile** (the quick info badges row), add:
- **Waste % badge**: Shows `10%` or whatever the room/material waste is
- **Install cost badge**: Shows the $/m2 or fixed rate if set

**In the expanded details section**, add:
- **Installation Cost row**: A compact inline editor with:
  - Toggle between "$/m2" and "Fixed $" modes
  - Input for the rate value
  - Optional: A small "Price Book" picker button to select from the price book
- **OOH Allowance checkbox**: A simple checkbox labeled "Out of Hours" that flags the room for OOH pricing. When checked, shows a small multiplier input (default 1.5x)

### How it feeds into the quote:

The `getRoomCost` function will be updated to include:
```text
Room Total = Material Cost + Installation Cost + (OOH Multiplier if checked)
```

Where:
- Material Cost = order m2 x material price
- Installation Cost = (net m2 x rate) for per_m2, or fixed amount for fixed
- OOH = Installation Cost x (multiplier - 1) if OOH is checked

---

## Part 4: Waste % on Collapsed Room Tile

Add a small badge showing the effective waste percentage on the collapsed tile's quick info badges row. This makes it immediately visible without expanding:

```text
[Accessories: 3] [2 seams] [0deg] [10% waste]
```

The badge shows `room.wastePercent` if set, otherwise the material's default `wastePercent`, or `10%` as fallback.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/usePriceBook.ts` | CRUD hook for price_book_items table |
| `src/pages/PriceBook.tsx` | Price Book management page |
| `src/components/pricebook/PriceBookCard.tsx` | Item display card |
| `src/components/pricebook/CreatePriceBookItemDialog.tsx` | Create dialog |
| `src/components/pricebook/EditPriceBookItemDialog.tsx` | Edit dialog |
| `src/components/pricebook/PriceBookItemPicker.tsx` | Compact picker for use in TakeoffPanel |

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Create `price_book_items` table with RLS |
| `src/App.tsx` | Add `/price-book` route |
| `src/pages/Dashboard.tsx` | Add "Price Book" nav button |
| `src/lib/canvas/types.ts` | Add `installCost` to `Room` interface |
| `src/components/editor/TakeoffPanel.tsx` | Add waste % badge on collapsed tile, add install cost editor + OOH checkbox in expanded section, update `getRoomCost` to include installation |

## Implementation Order

1. Create `price_book_items` database table with RLS policies
2. Create `usePriceBook.ts` hook
3. Create Price Book page and components (Card, Create, Edit dialogs)
4. Add route and Dashboard navigation
5. Update `Room` interface with `installCost` fields
6. Update `TakeoffPanel` collapsed tile with waste % badge
7. Add installation cost editor and OOH checkbox to expanded section
8. Create `PriceBookItemPicker` for quick selection in TakeoffPanel
9. Update cost calculations to include installation and OOH

