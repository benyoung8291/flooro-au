

# Quote PDF Preview Sidebar Overhaul

This plan converts the full-page quote preview into an inline sidebar panel that slides out from the right within the Quote Editor page, and completely redesigns the PDF document styling to use a clean white background matching the reference screenshots.

---

## Architecture Change

Currently the PDF preview is a separate route (`/quotes/:quoteId/preview`) rendering a full-page `QuotePreview` component. This will be replaced with a sidebar panel (using Radix Sheet) that opens from within the Quote Editor page itself, keeping full context visible on the left.

---

## 1. Create `QuotePdfSidebar` component

**New file**: `src/components/quotes/preview/QuotePdfSidebar.tsx`

This component wraps the document preview in a Sheet (slide-from-right panel):

- **Header**: "PDF Preview" title + close button (X)
- **Toolbar row**: "Download" button + toggle switches inline: Show Sub-Items, Hide Qty, Hide Pricing, Hide Sub Qty, Hide Sub Pricing (matching the reference screenshot layout with inline switches rather than a popover)
- **Scrollable document area**: A grey background container with a centered white "page" div that renders the quote document at a scaled-down size to simulate a page preview
- **Props**: `open`, `onOpenChange`, `quoteId` -- it internally fetches the quote, line items, org branding, and owner data (same hooks as current `QuotePreview`)

The Sheet will use a custom width (~520px on desktop) rather than the default `sm:max-w-sm`.

---

## 2. Redesign the PDF document content

**Refactored component**: `src/components/quotes/preview/QuotePdfDocument.tsx` (new)

Extracted from the current `QuotePreview` main content, this is a pure presentational component that renders the actual quote document. It receives all data as props (no routing, no hooks). This same component is used both inside the sidebar preview and for printing.

### Document design (matching reference screenshots):

**Page 1 - Header area:**
- Top-right: Quote metadata table (Qu. Nbr, Date, Valid Until) in a compact right-aligned grid
- Top-left: Company name (large, bold) + address lines + phone + email + ABN
- Below: Two-column "Quote To" / "Prepared By" section with contact details
- Orange/terracotta accent bar with the quote title (e.g., "Services Australia - Darebin")
- Letter body with "Dear [Client]," greeting and scope/description content

**Line items table:**
- Clean table with Description, Qty, Unit Price, Total columns
- Parent rows have left border accent (terracotta/orange) and slightly shaded background
- Child/sub-item rows are indented with no accent, lighter text
- Numbers use tabular-nums, right-aligned

**Totals:**
- Right-aligned totals section: Subtotal, GST, Total (inc GST) -- with bold total row

**Footer:**
- Contact email + page number at bottom of each page

### White background throughout:
- The document itself is always white (`#fff`)
- When shown in the sidebar, it sits on a light grey background to create the "paper on desk" effect
- All current cream/muted background references removed from the document CSS

---

## 3. Inline toggle toolbar (replaces PreviewToolbar popover)

**Modified file**: `src/components/quotes/preview/PreviewToolbar.tsx`

Replace the popover-based settings UI with an inline row of labeled toggle switches matching the reference:

```text
[Download]  Show Sub-Items [*]  Hide Qty [ ]  Hide Pricing [ ]  Hide Sub Qty [*]  Hide Sub Pricing [*]
```

Each toggle is a small Switch component with a compact label. On mobile, the toolbar wraps to two rows.

---

## 4. Update QuoteEditor to open sidebar instead of navigating

**Modified file**: `src/pages/QuoteEditor.tsx`

- Replace the FileText icon button (line 233-241) that navigates to `/quotes/${quoteId}/preview` with one that opens the sidebar via local state: `const [pdfOpen, setPdfOpen] = useState(false)`
- Add `<QuotePdfSidebar open={pdfOpen} onOpenChange={setPdfOpen} quoteId={quoteId} />` at the bottom of the component
- Remove the import of `useNavigate` usage for preview (keep it for other navigation)

---

## 5. Update routing

**Modified file**: `src/App.tsx`

- Remove the `/quotes/:quoteId/preview` route (line 45) since preview is now inline
- The `QuotePreview` page component can be kept for backwards compatibility or removed

---

## 6. Rewrite quote-print.css for white document design

**Modified file**: `src/styles/quote-print.css`

Complete redesign of the document styles:

- **White background** on `.quote-print-document` (no cream/muted)
- **Company header**: Left-aligned company name (large bold) with contact info stacked below; right-aligned quote meta table (Qu. Nbr, Date, Valid Until)
- **Accent color**: Use the app's terracotta/burnt orange for accent bars and parent row left borders
- **Items table**: Clean borders, parent rows with left terracotta border + light background tint, child rows indented with lighter text
- **Totals**: Right-aligned with clean separator lines
- **Footer**: Centered contact + page counter

### Print overrides:
- The `@media print` block will hide the sidebar chrome and print only the document content
- All colors forced to print-safe values with `print-color-adjust: exact`

---

## 7. Sidebar "paper preview" styling

Inside the sidebar, the document is rendered inside a scaled container:

```tsx
<div className="bg-muted/50 flex-1 overflow-y-auto p-4">
  <div className="bg-white shadow-lg mx-auto" style={{ width: '210mm', transform: 'scale(0.55)', transformOrigin: 'top center' }}>
    <QuotePdfDocument ... />
  </div>
</div>
```

This creates the "paper on grey background" effect visible in the reference screenshots, with the document scaled down to fit the sidebar width while maintaining A4 proportions.

---

## Technical Details

### Files to create

| File | Purpose |
|------|---------|
| `src/components/quotes/preview/QuotePdfSidebar.tsx` | Sheet wrapper with toolbar + scrollable document preview |
| `src/components/quotes/preview/QuotePdfDocument.tsx` | Pure presentational document component (extracted from QuotePreview) |

### Files to modify

| File | Changes |
|------|---------|
| `src/pages/QuoteEditor.tsx` | Add sidebar state, replace navigate-to-preview with open-sidebar, render `QuotePdfSidebar` |
| `src/components/quotes/preview/PreviewToolbar.tsx` | Convert from popover to inline toggle row |
| `src/styles/quote-print.css` | Complete redesign: white background, terracotta accents, clean table styling, paper-preview-in-sidebar styles |
| `src/App.tsx` | Remove `/quotes/:quoteId/preview` route |

### Files to keep (unchanged)

| File | Reason |
|------|--------|
| `src/components/quotes/preview/PreviewItemsTable.tsx` | Reused as-is inside `QuotePdfDocument` |
| `src/components/quotes/preview/PreviewLineItemRow.tsx` | Reused as-is |
| `src/components/quotes/preview/OptionalGroupSections.tsx` | Reused as-is |
| `src/hooks/useQuotePdfSettings.ts` | Reused as-is for toggle state |

### QuotePdfDocument.tsx props interface

```tsx
interface QuotePdfDocumentProps {
  quote: Quote;
  lineItems: LineItem[];
  org: OrganizationBranding | null;
  owner: QuoteOwnerProfile | null;
  settings: QuotePdfSettings;
  showQtyColumn: boolean;
  showUnitPriceColumn: boolean;
  showTotalColumn: boolean;
}
```

### Sheet width customization

The Sheet component's right variant defaults to `sm:max-w-sm`. The sidebar will override this with a custom className to be wider (~520px):

```tsx
<SheetContent side="right" className="sm:max-w-[520px] w-full p-0 flex flex-col">
```

### Print behavior

A "Download" / "Print" button in the sidebar toolbar will call `window.print()`. The print CSS will:
1. Hide the sidebar chrome (toolbar, close button)
2. Show only the document content full-width
3. Apply white background with forced print colors

