

# Color Scheme and Visibility Overhaul

The core problem is that the current design over-optimizes for "minimal" at the expense of readability. Ultra-low-opacity backgrounds, transparent borders, and low-contrast text colors make the interface hard to read. This plan boosts contrast and visibility across all quote components while keeping the clean aesthetic.

---

## Root Cause

The CSS variables define a warm cream palette where the muted foreground color (`hsl(30, 10%, 45%)`) is too close to the background (`hsl(40, 33%, 97%)`). Combined with partial opacity borders (`border-border/30`, `/50`, `/60`) and near-invisible zebra striping (`bg-muted/[0.03]`), everything washes out.

---

## Changes

### 1. Improve Base Color Contrast (src/index.css)

Darken the muted-foreground color so labels and secondary text are readable:
- Light mode `--muted-foreground`: change from `30 10% 45%` to `30 10% 38%` (darker)
- Light mode `--border`: change from `35 20% 88%` to `35 15% 82%` (more visible borders)
- Light mode `--input`: match the new border value

These small shifts make borders and labels noticeably more visible without changing the warm aesthetic.

### 2. Desktop Table -- Stronger Visual Structure (QuoteLineItemRow.tsx)

- **Zebra striping**: increase from `bg-muted/[0.03]` to `bg-muted/[0.08]` so alternating rows are actually visible
- **Row borders**: change from `border-border/60` (parent) and `border-border/30` (child) to full `border-border` -- no opacity reduction
- **Parent group left accent**: increase from `border-l-primary/60` to `border-l-primary` -- full opacity
- **Parent group background**: increase from `bg-muted/10` to `bg-muted/20`
- **Description inputs**: add a subtle persistent border (`border-border/50`) instead of fully transparent, so users can see where to type. Keep the stronger focus ring on click.
- **Number inputs**: same treatment -- light persistent border instead of invisible
- **Total column**: make the text slightly larger and bolder for scanning
- **Child connector line**: darken from `bg-border/60` to `bg-border`

### 3. Desktop Table Header (QuoteLineItemsTable.tsx)

- Header background: change from `bg-muted/30` to `bg-muted/50` for a stronger visual anchor
- Header text: change from `text-foreground/80` to `text-foreground` -- full opacity
- Header border: keep `border-b-2 border-border` (already solid)

### 4. Mobile Cards -- Better Contrast (QuoteLineItemsTable.tsx)

- Card borders: change from `border-border/50` to `border-border` -- full opacity
- Parent group left accent: `border-l-primary` instead of `border-l-primary/50`
- Child border-left: change from `border-primary/10` to `border-primary/30`
- Child bottom border: change from `border-border/20` to `border-border/60`
- Margin text in data chips: use `text-foreground` instead of `text-muted-foreground` so numbers are readable

### 5. Summary Bottom Bar (QuoteSummaryPanel.tsx)

- Border top: change from `border-border` to `border-border` (keep) but increase shadow intensity
- Labels ("Subtotal", "Margin", "GST"): use `text-foreground/60` instead of `text-muted-foreground` for slightly more contrast
- Total label: make more prominent with `text-foreground` weight

### 6. Quotes List Page (QuotesList.tsx)

- Quote row dividers: change from `divide-border/50` to `divide-border` -- full opacity
- Quote number text: change from `text-muted-foreground` to `text-foreground/60` for better legibility
- Date text: same treatment

### 7. Client Card (QuoteClientCard.tsx)

- Client detail inputs: add persistent `border-border/40` instead of `border-transparent` so fields are visible
- Preview text: keep current contrast (already legible)

### 8. MobileTapToEditValue Component

- Display values: use `text-foreground` consistently (already using it)
- Label text: keep `text-muted-foreground` but this will benefit from the global darkening in step 1

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Darken `--muted-foreground` and `--border` CSS variables for better contrast |
| `src/components/quotes/QuoteLineItemRow.tsx` | Stronger zebra stripes, full-opacity borders, visible input borders, bolder totals |
| `src/components/quotes/QuoteLineItemsTable.tsx` | Stronger header, full-opacity dividers, mobile card border fixes |
| `src/components/quotes/QuoteSummaryPanel.tsx` | Improve label contrast in bottom bar |
| `src/pages/QuotesList.tsx` | Full-opacity row dividers, better text contrast |
| `src/components/quotes/QuoteClientCard.tsx` | Visible input borders |

### Design Principle

The fix is simple: stop using opacity modifiers on things that need to be visible. Borders should be `border-border`, not `border-border/30`. Backgrounds should be at least 8% opacity to register visually. Text that needs to be read should be at least 38% lightness, not 45%.

