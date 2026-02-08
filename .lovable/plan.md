
# Quote Editor UI Polish

This plan addresses the spacing, typography, and layout issues visible in the screenshot. The changes focus on four areas: moving buttons above the white box, tightening row density, improving number fonts, and lifting quote info above the tabs.

---

## 1. Move "Add Item" and "From Price Book" buttons above the line items table

Currently these buttons sit at the bottom of the table inside the white container, butting up against the edges. They will be moved above the white box so they act as a toolbar row between the tabs and the table.

**File**: `src/pages/QuoteEditor.tsx`
- Remove `onAddLineItem` and `onOpenPriceBook` from the `QuoteLineItemsTable` props
- Add a toolbar row above the white container with the two buttons

**File**: `src/components/quotes/QuoteLineItemsTable.tsx`
- Remove the footer actions div (lines 578-588) that renders the "Add Item" and "From Price Book" buttons

---

## 2. Reduce row padding and improve number typography (Excel-like density)

Currently rows have `py-2.5` padding and inputs are `h-8`. This will be tightened to create a denser, spreadsheet-like feel.

**File**: `src/components/quotes/QuoteLineItemRow.tsx`
- Reduce row cell padding from `py-2.5` to `py-1` across all `<td>` elements
- Reduce input height from `h-8` to `h-7`
- Add `tabular-nums` to all number inputs for monospaced digit alignment
- Make the Total column use `text-sm` with `tabular-nums` for clean alignment

**File**: `src/components/quotes/QuoteLineItemRow.tsx` (FormattedNumberInput)
- Reduce height from `h-8` to `h-7`
- Add `tabular-nums` to the className
- Remove the border by default (show only on hover/focus) for a cleaner look

**File**: `src/components/quotes/QuoteLineItemsTable.tsx`
- Reduce header padding from `py-3` to `py-2`

---

## 3. Move totals outside the white box and add spacing

Currently the totals section is inside the white container with no breathing room. It will be moved outside the white box with proper top margin.

**File**: `src/pages/QuoteEditor.tsx`
- Move `QuoteEditorTotals` outside the white `<div>` container
- Add `pt-4` spacing above the totals

---

## 4. Move quote title and client info above tabs (always visible)

The quote number, status, and dates are already in the header bar. The quote title and a compact client summary line will be added between the header bar and the tabs so they are always visible regardless of which tab is active.

**File**: `src/pages/QuoteEditor.tsx`
- Add a section above the `<Tabs>` component showing:
  - An editable quote title input (borderless, large font)
  - A compact client summary line showing client name, email, and address as read-only text with pipe separators
- The "Details" tab will keep the full editable client card for editing all fields

---

## Technical Details

### QuoteEditor.tsx layout changes

The content area restructure:

```text
+-------------------------------------+
| Quote header (number, status, save) |  <-- existing header bar
+-------------------------------------+
| [Title input] "Untitled Quote"      |  <-- NEW: always-visible title
| Client Name | email | address       |  <-- NEW: compact client summary
+-------------------------------------+
| [Line Items] [Details] [Notes] tabs |  <-- existing tabs
+-------------------------------------+
| [+ Add Item] [From Price Book]      |  <-- MOVED: toolbar above table
+-------------------------------------+
| +-------------------------------+   |
| | Description | Qty | Cost | .. |   |  <-- white box (table only)
| | ...                           |   |
| +-------------------------------+   |
+-------------------------------------+
|              Subtotal   $4,947.03   |  <-- MOVED: outside white box
|              GST        $494.70     |
|              Total      $5,441.74   |
+-------------------------------------+
```

### Row density changes in QuoteLineItemRow.tsx

| Element | Before | After |
|---------|--------|-------|
| Cell padding | `py-2.5` | `py-1` |
| Input height | `h-8` | `h-7` |
| Input border | Always visible (`border-border/50`) | Transparent by default, visible on hover/focus |
| Number font | `font-mono` | `font-mono tabular-nums` |
| Header padding | `py-3` | `py-2` |

### FormattedNumberInput border change

```tsx
// Before
'border border-border/50 bg-transparent'
// After  
'border border-transparent bg-transparent'
'hover:border-border/50 focus:border-input'
```

This gives each cell a clean, borderless look by default (like a spreadsheet) but shows borders on interaction.

### Files modified

| File | Changes |
|------|---------|
| `src/pages/QuoteEditor.tsx` | Add title/client summary above tabs, move buttons above table, move totals outside white box |
| `src/components/quotes/QuoteLineItemRow.tsx` | Reduce padding, tighten inputs, improve number typography, borderless inputs |
| `src/components/quotes/QuoteLineItemsTable.tsx` | Remove footer buttons, reduce header padding |
