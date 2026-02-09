

# Excel Export Overhaul: Full Working Document with Live Formulas

## Overview

Transform the Excel export from a static client-facing snapshot into a **fully functional internal working document**. The spreadsheet will include all pricing columns (Cost, Margin%, Sell) and use **Excel formulas** instead of static values, so anyone can open it, change a quantity or cost price, and see totals recalculate automatically -- just like in the app.

## What Changes

### Current Export (static, client-facing)
- 4 columns: Description, Qty, Unit Price, Amount
- All values are hardcoded numbers
- No cost/margin data
- Changing a cell does nothing to other cells

### New Export (live working document)
- 7 columns: Description, Qty, Cost, Margin%, Sell, Line Cost, Line Sell
- All calculation cells use **Excel formulas**
- Editing Qty, Cost, or Margin% automatically recalculates Sell, Line Cost, Line Sell
- Parent rows with children use **SUM formulas** to aggregate child totals
- Totals section uses **SUM/formula references** for Subtotal, GST, and Grand Total
- Cell protection on formula cells (optional -- editable but clearly marked)

---

## Column Structure

| Column | Header | For child/standalone rows | For parent rows (with children) |
|--------|--------|--------------------------|--------------------------------|
| A | Description | Item name (indented for children) | Group name (bold) |
| B | Qty | Editable number | -- (blank) |
| C | Cost | Editable cost price | Formula: SUM of children's Line Cost |
| D | Margin % | Editable margin percentage | Formula: weighted margin from children |
| E | Sell | **Formula**: `=C{n}*(1+D{n}/100)` | Formula: SUM of children's Line Sell |
| F | Line Cost | **Formula**: `=B{n}*C{n}` | **Formula**: `=SUM(F{first_child}:F{last_child})` |
| G | Line Sell | **Formula**: `=B{n}*E{n}` | **Formula**: `=SUM(G{first_child}:G{last_child})` |

### Key formulas (matching the app's pricing model)

- **Sell price**: `= Cost * (1 + Margin / 100)` -- matches `calculateSellFromMargin`
- **Line Cost**: `= Qty * Cost`
- **Line Sell**: `= Qty * Sell` (this is what gets summed for totals)
- **Parent aggregation**: SUM formulas over child row ranges
- **Subtotal**: `=SUM(G{all parent Line Sell cells})`
- **GST**: `= Subtotal * tax_rate / 100`
- **Grand Total**: `= Subtotal + GST`

---

## Totals Section

| Label | Value |
|-------|-------|
| Subtotal | `=SUM(...)` over all non-optional parent Line Sell values |
| Total Cost | `=SUM(...)` over all non-optional parent Line Cost values |
| Margin | Formula: `=(Subtotal-TotalCost)/TotalCost*100` |
| GST (10%) | `=Subtotal * tax_rate / 100` |
| **TOTAL** | `=Subtotal + GST` |

---

## Visual Design (kept from current, enhanced)

- Same branded header with company name, quote metadata, client details, prepared by
- Same navy table headers, grey parent rows, alternating stripes
- Same notes/terms sections at the bottom
- **New**: Wider columns to accommodate the extra data columns
- **New**: Line Cost and Line Sell columns with light background to indicate they are calculated
- **New**: Formula cells use a subtle blue font or italic to hint they auto-calculate
- **New**: Excel row grouping (outline) so child rows can be collapsed/expanded in Excel

---

## Technical Details

### File to modify

| File | Changes |
|------|---------|
| `src/lib/quotes/exportQuoteToExcel.ts` | Complete rewrite of the column structure, replace static values with Excel formulas, add Line Cost/Line Sell columns, formula-driven totals, and Excel row grouping |

### No new files or dependencies needed

The existing `exceljs` library already supports formulas, row outlining (grouping), and all required features.

### Formula implementation approach

ExcelJS supports formulas via `cell.value = { formula: '...', result: 123 }`. The `result` field provides a cached value for apps that don't recalculate on open (but Excel/Google Sheets will recalculate automatically).

For each child row at Excel row `n`:
```
Sell (E{n})      = C{n}*(1+D{n}/100)
Line Cost (F{n}) = B{n}*C{n}
Line Sell (G{n}) = B{n}*E{n}
```

For parent rows spanning children from row `first` to `last`:
```
Line Cost (F{n}) = SUM(F{first}:F{last})
Line Sell (G{n}) = SUM(G{first}:G{last})
Cost (C{n})      = F{n}   (total cost)
Margin (D{n})    = IF(F{n}>0, (G{n}-F{n})/F{n}*100, 0)
Sell (E{n})      = G{n}   (total sell)
```

For totals:
```
Subtotal         = SUM of all parent Line Sell cells (e.g., =G15+G19+G23)
Total Cost       = SUM of all parent Line Cost cells
Margin           = IF(TotalCost>0, (Subtotal-TotalCost)/TotalCost*100, 0)
GST              = Subtotal * tax_rate / 100
TOTAL            = Subtotal + GST cell
```

### Excel row grouping

Child rows will be grouped under their parent using ExcelJS's `ws.getRow(n).outlineLevel = 1`. This lets users collapse/expand room groups directly in Excel using the +/- buttons, mirroring the expand/collapse in the app.

### Standalone parent items (no children)

These behave like child rows -- all columns are editable/formula-driven:
- Qty, Cost, Margin% are editable values
- Sell = formula
- Line Cost = formula
- Line Sell = formula

### Optional items section

Same as current: separated into its own section with a repeated header row. Optional item formulas work identically but are excluded from the main Subtotal formula.

### Page setup

- Landscape orientation (to fit 7 columns comfortably)
- A4 paper size
- Fit to width

