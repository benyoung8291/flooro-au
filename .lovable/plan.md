

# FieldFlow Quote Logic Gap Analysis and Implementation Plan

After thoroughly reviewing both the FieldFlow reference repo (`useSimpleQuoteLineItems.ts` + `InlineQuoteLineItems.tsx` + `QuoteDetails.tsx`) and Flooro's current implementation, here are the significant gaps that need to be addressed.

---

## Gap Analysis: What's Missing from Flooro

### 1. Pricing Calculation Formula Mismatch (Critical)

**FieldFlow** uses a markup-style formula:
```
sell = cost * (1 + margin / 100)
```
- When margin is 30%, cost $100 -> sell = $130
- When sell changes, margin recalculates: `margin = ((sell - cost) / cost) * 100`
- Cost changes always keep margin fixed, recalculate sell
- Sell changes always recalculate margin

**Flooro** uses a gross margin formula:
```
sell = cost / (1 - margin / 100)
```
- When margin is 30%, cost $100 -> sell = $142.86
- This is a completely different business model

**Action**: Replace Flooro's pricing formulas to match FieldFlow's markup-based calculations.

### 2. Parent Data Migration on Add Sub-Item (Critical)

**FieldFlow** has a key behavior when adding the first sub-item to a parent: if the parent already has pricing data (cost, sell, quantity), it automatically:
1. Creates a first sub-item from the parent's data
2. Clears the parent's cost/sell/margin fields
3. Then adds the new blank sub-item

This prevents data loss when converting a standalone item into a group.

**Flooro** is missing this entirely -- adding a sub-item just appends a blank child without migrating parent data.

### 3. Parent Row Behavior with Sub-Items (Critical)

**FieldFlow**:
- Parent rows with sub-items show **aggregated values** (sum of children's costs, sells, and a calculated overall margin)
- Parent quantity is forced to "1" when it has sub-items
- Parent cost/sell/margin fields become **read-only** showing aggregated totals
- Parent `line_total` = sum of all children's `line_total`

**Flooro**:
- Parent rows still show editable cost/sell/margin fields even with sub-items
- Parent totals don't aggregate from children
- No logic to disable editing on parent pricing when children exist

### 4. Reorder Controls (Up/Down Arrows) (Important)

**FieldFlow**: Has up/down arrow buttons on both parent rows and sub-item rows to reorder within their level.

**Flooro**: Has a GripVertical icon (visual only, no drag implemented) and no up/down arrow buttons.

### 5. Delete Confirmation for Parents with Children (Important)

**FieldFlow**: Shows an AlertDialog with three choices:
- "Cancel" -- abort
- "Keep Sub-items" -- ungroups children to standalone parents, then deletes the parent
- "Delete All" -- removes parent + all children

**Flooro**: Deletes immediately without any confirmation or option to keep children.

### 6. Ungroup / Promote Sub-Item (Medium)

**FieldFlow** has two extra actions:
- **Ungroup**: Converts all sub-items of a parent into standalone line items
- **Promote Sub-Item**: Moves a single sub-item out of its parent to become its own standalone parent

**Flooro**: Has neither of these operations.

### 7. Estimated Hours Column (Medium)

**FieldFlow**: Has a dedicated "Hours" column in the line items table for estimated hours per item, with sub-item hours also editable.

**Flooro**: Has `estimated_hours` in the data model but no column in the table UI.

### 8. Field Highlight Animation on Recalculation (Nice-to-have)

**FieldFlow**: When margin changes and sell recalculates (or vice versa), the affected cell gets a brief green flash/highlight animation (`bg-primary/10 ring-1 ring-primary/30`) to show the user what changed.

**Flooro**: No visual feedback when dependent fields change.

### 9. Number Input Formatting (Important)

**FieldFlow**: Uses `type="text"` with `inputMode="decimal"` for all numeric fields, with:
- Regex validation to only allow digits and single decimal point
- `onBlur` formatting to `.toFixed(2)`
- Prevents typing non-numeric characters

**Flooro**: Uses `type="number"` which has browser inconsistencies, no format-on-blur, and can produce unexpected values.

### 10. Sell Price Floor Validation (Important)

**FieldFlow**: When sell price changes, it validates `Math.max(sellNum, costNum)` -- sell can never go below cost.

**Flooro**: No sell price floor -- users can set sell below cost, leading to negative margins.

---

## Implementation Plan

### Phase A: Fix Pricing Calculations (useQuoteLineItems.ts)

1. Replace `calculateSellFromMargin` and `calculateMarginFromSell` to use FieldFlow's markup formula:
   - `sell = cost * (1 + margin / 100)` 
   - `margin = ((sell - cost) / cost) * 100`
2. Add sell price floor validation (sell >= cost)
3. Add format-on-blur behavior for cost/sell/margin inputs

### Phase B: Parent-Child Interaction Logic (useQuoteLineItems.ts)

1. **Data migration on addSubItem**: When adding the first sub-item to a parent with data, migrate parent's pricing into a new first child, then clear parent pricing
2. **Aggregated parent values**: Add `calculateAggregatedValues(parent)` function that computes:
   - Total cost = sum(child.qty * child.cost)
   - Total sell = sum(child.qty * child.sell) 
   - Margin = ((totalSell - totalCost) / totalCost) * 100
3. **Parent line_total auto-calculation**: When any child changes, recalculate parent's `line_total` as sum of children's totals
4. **Force parent qty = 1** when sub-items exist

### Phase C: Enhanced Row UI (QuoteLineItemRow.tsx + QuoteLineItemsTable.tsx)

1. **Parent row with children shows aggregated read-only values** instead of editable inputs for cost/sell/margin
2. **Add estimated hours column** to the table
3. **Add up/down arrow reorder buttons** for both parents and sub-items (replacing the non-functional GripVertical)
4. **Add ungroup action** on parent rows (converts children to standalone)
5. **Add promote action** on sub-item rows (moves to standalone parent)
6. **Add delete confirmation dialog** for parents with children (Keep Sub-items / Delete All / Cancel)
7. **Add field highlight animation** when dependent fields recalculate
8. **Switch numeric inputs** from `type="number"` to `type="text"` with `inputMode="decimal"` and regex validation + onBlur formatting

### Phase D: QuoteSummaryPanel Totals Fix

1. Update `computeTotals` to correctly aggregate from children (it already does this but needs to align with the new pricing formulas)
2. Ensure the total calculation matches FieldFlow's approach where parent items with children have their totals derived purely from children

---

## Technical Details

### New/Modified Files

| File | Changes |
|------|---------|
| `src/hooks/useQuoteLineItems.ts` | Replace pricing formulas, add data migration on addSubItem, add aggregation logic, add ungroup/promote operations |
| `src/components/quotes/QuoteLineItemRow.tsx` | Add hours column, switch to text inputs with formatting, show aggregated values for parents with children, add reorder buttons, add promote/ungroup actions |
| `src/components/quotes/QuoteLineItemsTable.tsx` | Add hours column header, add delete confirmation dialog, pass new props, add field highlight state |
| `src/components/quotes/QuoteSummaryPanel.tsx` | Align totals with new pricing model |

### Key Behavioral Rules (from FieldFlow)

1. **Cost changes**: Keep margin fixed, recalculate sell = `cost * (1 + margin/100)`
2. **Margin changes**: Keep cost fixed, recalculate sell = `cost * (1 + margin/100)`
3. **Sell changes**: Keep cost fixed, recalculate margin = `((sell - cost) / cost) * 100`, enforce sell >= cost
4. **Parent with children**: Cost/Sell/Margin cells become read-only showing aggregated values; parent line_total = sum of child line_totals
5. **First sub-item added**: Migrate parent data to first child, clear parent, add blank second child
6. **Delete parent with children**: Show dialog with Cancel / Keep Sub-items (ungroup) / Delete All
7. **Sub-item promote**: Extract sub-item, create standalone parent after the original parent
8. **Ungroup parent**: Convert all children to standalone parents, remove the parent shell

