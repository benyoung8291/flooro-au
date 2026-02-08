

# Quote Editor UX Overhaul - Phase 2

This plan addresses three core issues: poor visual clarity on desktop/mobile, the broken scope/description input, and the removal of the Hours column.

---

## 1. Remove the Hours Column Entirely

The "Hours" column will be removed from the desktop table and mobile card layout. This simplifies the UI by removing an unused column.

**Desktop table**: Remove the "hours" column from `colgroup`, `thead`, and the `QuoteLineItemRow` component.

**Mobile cards**: Remove the full-width "Hours" field from both parent and child card grids.

**Summary bar**: Remove the hours display from `QuoteSummaryPanel`.

**Files affected**: `QuoteLineItemRow.tsx`, `QuoteLineItemsTable.tsx`, `QuoteSummaryPanel.tsx`

---

## 2. Fix and Upgrade the Scope/Description Input

Currently the description field in `QuoteClientCard.tsx` is a single-line `<input>` element. This is why typing doesn't work well -- it cannot handle multi-line text and has no formatting.

**Solution**: Replace the plain `<input>` with a `<textarea>` that supports:
- Multi-line text entry with auto-growing height
- Basic formatting via Markdown-style conventions stored as HTML
- A mini formatting toolbar (Bold, Italic, Bullet list, Numbered list) using `contentEditable` div
- The formatted content is stored as HTML in the `description` text column
- On the PDF preview, the HTML is rendered directly using `dangerouslySetInnerHTML` with sanitization

**Implementation approach**: Use a `contentEditable` div with `execCommand` for basic formatting (bold, italic, lists). This avoids adding a heavy rich text editor dependency while giving users the formatting they need. The HTML output is stored in the existing `description` text field in the database.

**Files affected**: `QuoteClientCard.tsx` (new rich text editor component inline), `QuotePreview.tsx` (render HTML description)

---

## 3. Desktop Table Visual Overhaul

The current desktop table lacks clear visual separation between rows and has hard-to-read data.

**Changes**:
- Add alternating row backgrounds (zebra striping) for better readability
- Increase row padding from `py-1.5` to `py-2.5` for breathing room
- Add stronger border lines between rows (from `border-border/40` to `border-border`)
- Make the table header row visually stronger with a background tint
- Parent group rows get a distinct left border accent (4px primary colored) so they stand out
- Child rows get slightly more indentation and a subtle connector line
- The description column gets more width proportion
- Number columns get a subtle right-align background strip for scanning
- Total column is visually emphasized with slightly bolder font weight
- Column widths adjusted: remove hours column width, redistribute to description

**Files affected**: `QuoteLineItemRow.tsx`, `QuoteLineItemsTable.tsx`

---

## 4. Mobile Card Layout Complete Redesign

The current mobile layout expands every field into a grid which wastes space and is hard to scan. The new design follows a compact, scannable approach.

**New mobile card structure**:

```text
+--------------------------------------------------+
| [arrows] Description input          $1,250.00 [...] |
|                                                    |
|  Qty: 10  |  Cost: $85.00  |  Sell: $125.00       |
|                          Margin: 47.1%             |
+--------------------------------------------------+
```

Key changes:
- **Inline number display**: Instead of a 2-column grid of full-size inputs, show numbers as compact inline chips/badges that are tappable to edit
- **Tap-to-edit pattern**: Numbers display as read-only text by default. Tapping a value opens it for inline editing, then blurs back to display mode. This shows maximum data in minimum space
- **Description + Total on header row**: Already done, keep this pattern
- **Remove the full grid of inputs**: Replace with a single compact row of labeled values
- **Child items**: Show as tighter indented rows with just description + total, expandable to show cost details
- **Reorder arrows**: Move to a drag handle icon on the left edge, smaller and less prominent

**Files affected**: `QuoteLineItemsTable.tsx` (mobile section rewrite)

---

## 5. Print CSS Updates

- Remove any hours-related column styles
- Ensure the rich text description renders properly in print
- Add `white-space: pre-wrap` and HTML rendering support for the description in the PDF info box

**Files affected**: `quote-print.css`, `QuotePreview.tsx`

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/quotes/QuoteLineItemRow.tsx` | Remove hours column, increase padding, add zebra/accent styles, stronger borders |
| `src/components/quotes/QuoteLineItemsTable.tsx` | Remove hours from colgroup/thead, redesign mobile cards to compact tap-to-edit layout, adjust column widths |
| `src/components/quotes/QuoteClientCard.tsx` | Replace description input with contentEditable rich text editor with formatting toolbar |
| `src/components/quotes/QuoteSummaryPanel.tsx` | Remove hours display from bottom bar |
| `src/pages/QuotePreview.tsx` | Render description as HTML instead of plain text |
| `src/styles/quote-print.css` | Add rich text description styling, remove hours references |

### Rich Text Editor Approach

Using `contentEditable` with a mini toolbar rather than a full library like TipTap or Slate:
- Keeps bundle size small (zero new dependencies)
- Supports bold, italic, underline, bullet lists, numbered lists
- Stores output as HTML string in the existing `description` text column
- Renders directly in PDF preview via `dangerouslySetInnerHTML`
- The toolbar uses simple `document.execCommand()` calls (bold, italic, insertUnorderedList, insertOrderedList)
- Styling matches the Google Docs aesthetic with a floating mini toolbar

### Mobile Tap-to-Edit Pattern

Each numeric value renders as a styled span by default. On tap:
1. The span becomes an input field (auto-focused, auto-selected)
2. User types new value
3. On blur, value saves and returns to display mode

This pattern maximises information density on small screens while keeping everything editable.
