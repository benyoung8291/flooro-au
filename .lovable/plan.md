

# Excel Export for Quotes

## Overview

Add a professional Excel (.xlsx) export to the Quote Editor that mirrors the quote's structure -- company header, client details, grouped line items with parent/child hierarchy, totals, notes, and terms. The export will use the `exceljs` library which runs entirely in the browser and supports cell styling, merged cells, and borders.

## What the Export Will Include

The Excel file will be a polished, branded document with these sections:

1. **Header** -- Company name, address, phone, email, ABN, plus quote metadata (quote number, date, valid until)
2. **Client Details** -- "Quote To" block with client name, address, email, phone; plus "Prepared By" block
3. **Quote Title** -- Merged row with the quote title if present
4. **Scope / Description** -- Plain-text version of the rich-text description
5. **Line Items Table** -- Full table with columns: Description, Qty, Unit Price, Amount
   - Parent items shown as bold grouped rows
   - Child items indented underneath their parent
   - Optional items in a separate "Optional Items" section
6. **Totals** -- Subtotal, GST, Grand Total
7. **Notes** -- If present
8. **Terms and Conditions** -- If present

## Visual Design in Excel

- Company name in large bold font at the top
- Quote number and dates in a right-aligned metadata block
- Line items table with:
  - Dark header row (navy background, white text)
  - Parent rows with light grey background and bold text
  - Child rows with normal weight and indented description (prefixed with spaces)
  - Alternating subtle shading for readability
  - Currency formatting on price columns
  - Borders around the table
- Totals section right-aligned with bold grand total row
- Column widths auto-sized for readability

---

## Technical Details

### New dependency

`exceljs` -- a full-featured Excel library that works in the browser. Supports:
- Cell styling (fonts, fills, borders, alignment)
- Merged cells
- Column widths
- Number formatting
- Workbook/worksheet creation
- Browser-side file generation via Blob

### Files to create

| File | Purpose |
|------|---------|
| `src/lib/quotes/exportQuoteToExcel.ts` | Core export function: takes quote, lineItems, org, owner data and generates a styled .xlsx file, triggering a browser download |

### Files to modify

| File | Changes |
|------|---------|
| `src/pages/QuoteEditor.tsx` | Add "Export Excel" button in the header action bar (next to the PDF preview eye icon) |

### Export function interface

```typescript
interface ExportQuoteParams {
  quote: Quote;
  lineItems: LineItem[];
  org: OrganizationBranding | null;
  owner: QuoteOwnerProfile | null;
}

async function exportQuoteToExcel(params: ExportQuoteParams): Promise<void>
// Downloads the file as "{quote_number} - {client_name || 'Quote'}.xlsx"
```

### Excel worksheet structure (row layout)

```text
Row 1:  [Company Name - large bold]                    [Quote No.] [Q-0042]
Row 2:  [Company Address]                              [Date]      [12 Jan 2025]
Row 3:  [Company Phone]                                [Valid Until] [12 Feb 2025]
Row 4:  [Company Email / ABN]
Row 5:  (blank)
Row 6:  QUOTE TO              |  PREPARED BY
Row 7:  Client Name           |  Owner Name
Row 8:  Client Address        |  Owner Email
Row 9:  Client Email          |  Owner Phone
Row 10: (blank)
Row 11: [Quote Title - merged, bold]
Row 12: [Description text - merged, wrapped]
Row 13: (blank)
Row 14: [Description] [Qty] [Unit Price] [Amount]   <-- header row, styled
Row 15: Room 1 (parent - bold, grey bg)
Row 16:   Vinyl Supply (child - indented)
Row 17:   Installation (child - indented)
Row 18:   Coving (child - indented)
Row 19: Room 2 (parent - bold, grey bg)
Row 20:   ...
...
Row N:  (blank)
Row N+1: [Optional Items header if any]
Row N+2: ...optional items...
Row N+3: (blank)
Row N+4:                              Subtotal   $X,XXX.XX
Row N+5:                              GST (10%)  $XXX.XX
Row N+6:                              TOTAL      $X,XXX.XX  (bold)
Row N+7: (blank)
Row N+8: Notes: ...
Row N+9: (blank)
Row N+10: Terms & Conditions: ...
```

### UI placement

The export button will be added to the Quote Editor header bar, next to the existing PDF preview (eye) icon:

```text
[Takeoff] [Status v] [Eye] [Download] [Save]
                             ^^^
                      New Excel export button
```

It will use a `FileSpreadsheet` icon from lucide-react with a dropdown that offers "Export Excel" (and the existing PDF preview can stay as-is). Or simpler: just a direct icon button that triggers the download.

### Data flow

1. User clicks the Excel export button in the Quote Editor header
2. The handler calls `exportQuoteToExcel()` with the current quote, lineItems (from the existing hook), org branding, and owner profile
3. ExcelJS builds the workbook in memory
4. The workbook is written to a Blob and downloaded via a temporary anchor element
5. A toast confirms "Excel exported successfully"

No server-side processing needed -- everything happens in the browser.

