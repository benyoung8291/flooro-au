

# CSV Export for Quote Line Items (Import-Ready)

## Overview

Add a CSV export option that outputs quote line items in a clean, flat, import-friendly format. Unlike the Excel working document (which is styled and formula-driven), this CSV is designed to be ingested by other software -- accounting tools, estimating platforms, CRMs, or custom import scripts.

## CSV Structure

Each row represents a single line item (children are flattened alongside parents). The columns are structured for maximum compatibility with other systems:

| Column | Description |
|--------|-------------|
| `group` | Parent/room name (for child items) or blank (for standalone items) |
| `description` | The line item description |
| `quantity` | Numeric quantity |
| `unit` | Unit of measure (from metadata if available, otherwise blank) |
| `cost_price` | Cost per unit |
| `sell_price` | Sell per unit |
| `margin_percent` | Margin percentage |
| `line_cost` | qty x cost |
| `line_sell` | qty x sell (line total) |
| `is_optional` | TRUE/FALSE -- whether this is an optional item |
| `source_room_id` | Room ID from takeoff (for traceability, blank if not linked) |
| `price_book_item_id` | Price book reference ID (blank if not linked) |

### Key design decisions for import compatibility

- **Flat structure**: No nested rows. Every child item is its own row with the parent name in the `group` column, making it trivial to filter/group in any system.
- **No formulas, no styling**: Pure data values only.
- **Standard CSV**: Comma-delimited, UTF-8 with BOM (for Excel compatibility), quoted strings.
- **Header row**: Always present as the first row.
- **Parent-only rows excluded**: Parents with children are not output as their own row (they're just grouping containers). Standalone parents (no children) are output normally with `group` left blank.
- **Boolean as TRUE/FALSE**: Standard format most import tools understand.

### Example output

```
group,description,quantity,unit,cost_price,sell_price,margin_percent,line_cost,line_sell,is_optional,source_room_id,price_book_item_id
Room 1,Vinyl Supply,25.00,,18.50,25.90,40.00,462.50,647.50,FALSE,,pb-001
Room 1,Installation,25.00,,12.00,16.80,40.00,300.00,420.00,FALSE,,pb-002
Room 1,Coving,15.00,,4.50,6.30,40.00,67.50,94.50,FALSE,,
Room 2,Carpet Supply,30.00,,22.00,30.80,40.00,660.00,924.00,FALSE,,pb-003
Transitions,T-Bar Aluminium,3.00,,8.00,11.20,40.00,24.00,33.60,FALSE,,
```

---

## UI Integration

Add a CSV download button next to the existing Excel export button. Both will use icon buttons with tooltips:

- Existing: FileSpreadsheet icon = Excel export (working document)
- New: FileDown icon = CSV export (import-ready data)

The CSV button will appear right next to the Excel button in the header toolbar.

---

## Technical Details

### New file

| File | Purpose |
|------|---------|
| `src/lib/quotes/exportQuoteToCsv.ts` | Pure function that takes `lineItems` and returns a CSV string, then triggers a browser download |

### Modified file

| File | Changes |
|------|---------|
| `src/pages/QuoteEditor.tsx` | Add CSV export button and handler next to the Excel export button |

### Implementation approach

The CSV export function will:
1. Accept the `lineItems` array (same data the Excel export uses)
2. Iterate through parents -- for parents with children, output each child as a row with `group` set to the parent description; for standalone parents, output the parent itself with `group` blank
3. Build a CSV string with proper escaping (double-quote any field containing commas, quotes, or newlines)
4. Prepend UTF-8 BOM (`\uFEFF`) for Excel compatibility
5. Create a Blob and trigger download as `{quote_number} - Line Items.csv`

### No new dependencies needed

CSV generation is simple string concatenation -- no library required.

