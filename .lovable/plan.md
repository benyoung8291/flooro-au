

# Quote Preview/PDF Overhaul -- FieldFlow Feature Parity

## What FieldFlow Has vs. What Flooro Has

After reviewing the FieldFlow repository's `QuotePDFPreview.tsx`, `QuotePDFDocument.tsx`, and the `src/lib/pdf/` support library, here is a comprehensive gap analysis. FieldFlow gives users extensive control over how their quote PDF looks before downloading it.

---

## Gap Analysis

### 1. Display Control Toggles (Critical -- Missing Entirely)

FieldFlow provides a toolbar with toggle switches that let users customize what appears on the PDF **in real-time**:

| Toggle | FieldFlow | Flooro |
|--------|-----------|--------|
| **Show Sub-items** | Toggle to show/hide sub-item rows under parents | Always shows all sub-items |
| **Hide Qty** (parent) | Hides the quantity column for parent rows | No option |
| **Hide Pricing** (parent) | Hides unit price and total columns for parents | No option |
| **Hide Sub Qty** | Hides quantity for sub-items (when shown) | No option |
| **Hide Sub Pricing** | Hides unit price and total for sub-items | No option |

These toggles are **persisted to localStorage** so users' preferences are remembered across sessions.

### 2. Column Visibility Logic (Critical)

When both parent and sub-item pricing/quantity are hidden, the entire column disappears from the table, and the Description column expands to fill the extra space. This is handled by `getVisibleColumns()` and `getColumnWidth()` in the `DynamicLineItemsTable`.

### 3. Zoom Controls (Important)

FieldFlow has zoom in/out buttons with percentage display, and **auto-zoom to fit container width** using a `ResizeObserver`. Flooro has no zoom controls.

### 4. Page Count Display (Nice-to-have)

FieldFlow shows the number of pages in the preview toolbar (e.g., "2 pages").

### 5. Settings Persistence (Important)

All PDF preview settings (toggle states) are saved to `localStorage` under `quote-pdf-settings` and restored on mount.

### 6. Parent Row Aggregation in PDF (Critical)

When sub-items are shown, parent rows display the **aggregated total** (sum of children) as the parent's unit price is derived from `line_total / qty`. When sub-items are hidden, parents show their own unit price and total directly.

### 7. Optional Items as Grouped Sections (Important)

FieldFlow supports **optional groups** with named sections (e.g., "Option A", "Option B") displayed as separate divider sections in the PDF, each with their own sub-total. There are two modes:
- **Alternatives (OR)**: Each option shows "Quote Total with Option X" breakdown
- **Add-ons (AND)**: Options show their subtotals, and the main totals section shows a combined total

Flooro currently just separates items into "Required" and "Optional" tables.

---

## Implementation Plan

Since Flooro uses a CSS-based `window.print()` approach rather than `@react-pdf/renderer`, the implementation will adapt FieldFlow's toggle/control concepts to work with Flooro's existing HTML/CSS print system. This keeps things simpler and avoids adding heavy PDF rendering dependencies.

### Phase 1: Preview Toolbar with Display Toggles

Add a toolbar below the existing header with all the visibility controls:

**New state variables (with localStorage persistence):**
- `showSubItems` (boolean, default: true)
- `hideParentQty` (boolean, default: false)
- `hideParentPricing` (boolean, default: false)
- `hideSubItemQty` (boolean, default: false)
- `hideSubItemPricing` (boolean, default: true -- FieldFlow's default)

**Toolbar UI:**
- Row of Switch + Label pairs matching FieldFlow's layout
- Conditional visibility: "Hide Sub Qty" and "Hide Sub Pricing" only appear when "Show Sub-items" is ON
- Settings saved to localStorage on change, restored on mount

### Phase 2: Dynamic Table Column Rendering

Update the `LineItemRow` component and table headers to respect the toggle states:

- When `hideParentQty` is true, parent rows show empty Qty cells
- When `hideParentPricing` is true, parent rows show empty Unit Price and Total cells
- When `hideSubItemQty` is true, sub-item rows show empty Qty cells
- When `hideSubItemPricing` is true, sub-item rows show empty Unit Price and Total cells
- When both parent AND sub-item versions of a column are hidden, the entire column header is removed and the Description column gets wider
- Sub-item rows are conditionally rendered based on `showSubItems`

### Phase 3: Parent Aggregation Display

When sub-items ARE shown:
- Parent rows display aggregated total from children
- Parent unit_price is derived as `line_total / quantity`
- Parent quantity shows as "1" (group quantity)

When sub-items are NOT shown:
- Parent rows display their own pre-aggregated values (already calculated in the hook)
- This gives a clean summary view with just parent totals

### Phase 4: Optional Group Sections

Enhance the optional items handling to support named groups:

- Group optional items by a group identifier (we can use the parent item as the group name, since Flooro's parent/child hierarchy naturally creates groups)
- Each optional group gets its own divider and sub-total
- Show "Quote Total with [Group Name]" calculation for alternatives mode

### Phase 5: Print CSS Updates

Update `quote-print.css` to support:
- Hidden columns (`.col-hidden` class that applies `display: none`)
- Dynamic description column width when columns are hidden
- Proper print rendering for the new toolbar (already `print:hidden`)

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/QuotePreview.tsx` | Major rewrite: add toolbar with toggles, dynamic column rendering, optional group handling, localStorage persistence |
| `src/styles/quote-print.css` | Add column visibility classes, dynamic widths, optional group divider styles |

### No New Files Needed

Everything fits within the existing QuotePreview page and CSS.

### Key Implementation Notes

1. **Column visibility logic**: A helper function `getVisibleColumns()` determines which columns to render based on the combination of parent and sub-item hide settings. If both parent qty AND sub-item qty are hidden (or sub-items are off), the Qty column header disappears entirely.

2. **Dynamic width redistribution**: When columns are hidden from the table, the Description column should expand. This can be done with CSS classes that set different `width` percentages based on which columns are visible.

3. **localStorage key**: `quote-pdf-settings` to match FieldFlow's pattern. Settings are loaded on mount and saved on every toggle change.

4. **Optional group totals**: For each optional group, calculate:
   - Group subtotal (sum of items in group)
   - GST rate derived from the main quote's tax_rate
   - "Quote Total with Option" = base subtotal + group subtotal + combined GST

5. **No additional dependencies**: Everything uses existing Flooro components (Switch, Label, Select from Radix UI) and CSS print media queries. No need for `@react-pdf/renderer` or `react-pdf`.

### Toggle Defaults (matching FieldFlow)

```
showSubItems: true
hideParentQty: false
hideParentPricing: false
hideSubItemQty: false
hideSubItemPricing: true  (FieldFlow hides sub-item pricing by default)
```

