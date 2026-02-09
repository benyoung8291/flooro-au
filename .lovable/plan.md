

# Quote PDF Document Redesign

Two issues to fix: (1) the scope/description spacing is broken in the PDF output, and (2) the entire document design needs to match the reference PDF style (Premrest Quote-002089).

---

## Issue 1: Scope/Description Spacing

The current `.doc-scope-content` CSS uses minimal margin/padding for rich text content. The `dangerouslySetInnerHTML` renders the user's HTML which includes `<ul>`, `<p>`, `<br>` tags but the PDF CSS isn't properly styling the spacing between paragraphs and lists. Comparing the editor screenshot vs the PDF screenshot, bullet lists and paragraphs are running together without proper vertical rhythm.

**Fix**: Update the rich text content CSS rules in `quote-print.css` to add proper paragraph spacing and list margins matching the editor output.

---

## Issue 2: Complete Document Redesign

The reference PDF (Premrest Quote-002089) has a distinctly different layout from the current design. Here are the key differences:

### Reference PDF Structure (top to bottom):

1. **Header**: Right-aligned metadata table (Quote Nbr, Date, Valid Until, Customer ID) in a bordered grid. Left side has company logo, name, address, phone, email, ABN stacked vertically.

2. **Two-column contact section**: "Quote To" on the left (client name, address, ABN) and "Prepared By" on the right (person name) plus "Site Location" below.

3. **Title bar**: An accent-colored bar with the quote title/project name.

4. **Letter body**: "Hi team," greeting followed by scope of works description as plain flowing text with headings and bullet lists. No box or border around it -- it reads like a letter.

5. **Items table**: Simple clean table with Description, Qty, Unit Price, Total columns. No heavy row backgrounds -- just clean borders and subtle shading.

6. **Totals**: Right-aligned, simple rows for Subtotal, GST, Total (inc GST).

7. **Footer**: Centered contact email and page number.

### Key design differences from current:

| Current | Reference |
|---------|-----------|
| Dark navy meta strip bar across full width | Right-aligned bordered metadata grid |
| "Bill To" / "Prepared By" in bordered cards | Clean text-only layout with labels |
| Quote title in accent-bordered box | Accent-colored banner bar |
| Scope in bordered section | Free-flowing letter text, no borders |
| Heavy parent row backgrounds | Clean, minimal table styling |
| Grand total in dark filled row | Simple bordered total row |
| Acceptance/signature section | Not present in reference (can keep as optional) |

---

## Changes

### File 1: `src/components/quotes/preview/QuotePdfDocument.tsx`

Restructure the document layout to match the reference:

- **Header**: Change to two-column layout. Left column: logo + company name + address/phone/email/ABN stacked. Right column: bordered metadata grid with rows for Quote Nbr, Date, Valid Until.
- **Remove the dark meta strip** entirely.
- **Contact section**: Render "Quote To" and "Prepared By" as simple labeled text blocks (no card borders). Add "Site Location" field using `client_address`.
- **Title bar**: Render as a full-width accent-colored banner with the quote title text.
- **Scope/Description**: Remove wrapping borders. Render the greeting and description as flowing letter text directly on the page.
- **Items table section header**: Change from uppercase bordered header to a simple "QUOTED ITEMS" label with bottom border.
- **Totals**: Simplify to right-aligned rows without the bordered box wrapper. Keep Subtotal, GST, Total rows.
- **Footer**: Simplify to centered contact email + page indicator.
- **Keep**: Notes, Terms, and Acceptance sections (they work as-is for when present).

### File 2: `src/styles/quote-print.css`

Complete restyle to match the reference design:

- **Header**: Two-column flex layout. Company info left, metadata grid right with thin borders.
- **Remove**: `.doc-meta-strip` dark bar styles (replaced by metadata grid in header).
- **Parties**: Remove card borders and background. Simple text blocks with label styling.
- **Quote title**: Full-width accent banner (terracotta/orange background, white or dark text).
- **Scope**: Remove borders and padding. Let content flow naturally as letter text. Fix rich text spacing -- add proper margins between paragraphs (`p` tags get `margin-bottom`), lists get proper vertical spacing, `br` tags create visible line breaks.
- **Items table**: Cleaner styling -- lighter borders, remove heavy parent row backgrounds, keep subtle distinction between parent/child rows.
- **Totals**: Remove bordered box wrapper. Right-aligned simple rows with a top border separator.
- **Footer**: Simple centered line.
- **Rich text content**: Proper spacing rules -- `div > br`, paragraph gaps, list margins matching what the editor produces.

### File 3: `src/components/quotes/preview/QuotePdfSidebar.tsx`

Minor updates:
- Ensure the paper wrapper background remains white.
- No structural changes needed -- the sidebar shell is working correctly.

---

## Technical Details

### QuotePdfDocument.tsx -- new header structure

```text
+------------------------------------------+------------------+
| [Logo]                                   | Quote Nbr: Q-xxx |
| Company Name                             | Date: dd/mm/yyyy |
| Address line 1                           | Valid Until: ...  |
| Ph: xxxx | email@co.com.au               |                  |
| ABN: xx xxx xxx xxx                      |                  |
+------------------------------------------+------------------+

Quote To: Client Name              Prepared By: Owner Name
Address line                       
ABN: xxxxx (if available)          Site Location: Address

+==========================================+
|         Quote Title / Project Name       |  <-- accent banner
+==========================================+

Hi Client,

[scope/description content flows here as letter text]

QUOTED ITEMS
---------------------------------------------
Description         | Qty | Unit Price | Total
Item 1              | 1   | $4,600.00  | $4,600.00
---------------------------------------------

                              Subtotal: $4,600.00
                              GST:        $460.00
                        Total (inc GST): $5,060.00

Contact us at email@co.com.au
Page: 1 of 1
```

### CSS scope/description spacing fix

The rich text content needs these rules:

```css
.doc-scope-content p,
.doc-scope-content div {
  margin-bottom: 0.5em;
}

.doc-scope-content ul,
.doc-scope-content ol {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.doc-scope-content li {
  margin: 0.25em 0;
}

.doc-scope-content br {
  display: block;
  content: "";
  margin-top: 0.25em;
}
```

This ensures the spacing between paragraphs, lists, and line breaks in the PDF matches what the user sees in the rich text editor.

### Metadata grid (replaces dark strip)

The right-aligned metadata in the header will be a simple bordered table:

```css
.doc-meta-grid {
  border: 1px solid var(--doc-border);
  border-collapse: collapse;
  font-size: 11px;
}

.doc-meta-grid td {
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--doc-border);
}

.doc-meta-grid .doc-meta-label-cell {
  font-weight: 600;
  color: var(--doc-text-secondary);
  white-space: nowrap;
}
```

### Accent banner for quote title

```css
.doc-quote-title {
  background: var(--doc-accent-bar);  /* terracotta/warm color */
  color: white;
  padding: 0.6rem 1rem;
  font-weight: 600;
  font-size: 13px;
  margin: 1rem 0;
}
```

### Files summary

| File | Action |
|------|--------|
| `src/components/quotes/preview/QuotePdfDocument.tsx` | Restructure layout to match reference PDF |
| `src/styles/quote-print.css` | Complete restyle + fix rich text spacing |
| `src/components/quotes/preview/QuotePdfSidebar.tsx` | Minor cleanup if needed |

