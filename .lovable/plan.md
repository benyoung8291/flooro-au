

# Quote UI/UX Overhaul -- World-Class Google-Inspired Design

## Vision

Transform the quotes experience from a functional but cluttered interface into a clean, spacious, Google-quality design. Think Google Sheets meets Google Docs -- minimal chrome, generous whitespace, clear visual hierarchy, and an interface that gets out of the user's way.

---

## Current Problems Identified

1. **Quotes List Page**: Stats cards take up too much vertical space, filter tabs are cramped, quote cards are dense with small text
2. **Quote Editor**: Header is cluttered (quote number, title, status, save all crammed together). Client card and summary panel feel disconnected. The line items table has too many tiny columns fighting for space with confusing arrow buttons
3. **Mobile**: Line item cards have 6 numeric fields in a 3-column grid that's impossibly small to tap. Reorder arrows are tiny. The mobile experience is barely usable
4. **Quote Preview/PDF**: Toolbar toggles are a flat row that wraps awkwardly on mobile. No visual grouping of related controls

---

## Design Principles (Google-Inspired)

- **Breathing room**: 16-24px spacing between sections, generous padding inside cards
- **Visual hierarchy through typography**: Use size and weight, not borders and backgrounds
- **Minimal borders**: Rely on whitespace to separate sections, not lines everywhere
- **Clean inputs**: Borderless inputs that only show borders on hover/focus (like Google Sheets cells)
- **Elevation over borders**: Subtle shadows instead of heavy border styling
- **Consistent 8px grid**: All spacing in multiples of 4/8
- **Touch-friendly mobile**: Minimum 44px tap targets, single-column layouts

---

## Phase 1: Quotes List Page Overhaul

### File: `src/pages/QuotesList.tsx`

**Header**: Simplify to just logo, "Quotes" title, and primary "New Quote" button. Remove the back arrow (quotes is a top-level page). Move ThemeToggle out of the header (it belongs in settings).

**Stats Row**: Convert from 4 chunky cards into a compact inline stat bar -- a single row with dividers showing "24 quotes | $45,200 total | 8 accepted | 3 pending". Lightweight, one line, no cards.

**Filter Bar**: Combine search and tabs into a single clean bar. Search input on the left with a larger, more prominent pill-style design. Status filter chips (not tabs) on the right, styled as subtle pills with a dot indicator for the active filter.

**Quote Cards**: Redesign as cleaner list rows:
- Left side: Quote number (monospace, slightly muted) + title on the same line, client name below in smaller text
- Right side: Total amount (large, prominent) + date below
- Status badge as a colored dot + text instead of a full badge
- More menu stays but becomes a subtle icon that's always visible
- Remove the margin percentage display from the list (too detailed for a list view)

**Empty State**: Larger illustration area, more prominent CTA button

### File: `src/components/quotes/CreateQuoteDialog.tsx`

No major changes needed -- dialog is already clean.

### File: `src/components/quotes/QuoteStatusBadge.tsx`

Redesign as a minimal dot + text indicator instead of a full badge. Smaller, cleaner, less visual weight.

---

## Phase 2: Quote Editor Page Overhaul

### File: `src/pages/QuoteEditor.tsx`

**Layout restructure**: Move from a top-down stack (header -> client card + summary -> table) to a cleaner architecture:

- **Sticky header**: Quote number + status dot + save button only. Ultra-minimal. Title goes into the body.
- **Content area**: Full-width single column. Remove the 280px sidebar -- instead, make the summary a collapsible section or a bottom bar on desktop.
- **Flow**: Title/description inline-editable at the top (like a Google Doc title), then client details as a collapsible section, then line items, then a fixed bottom summary bar.

**Client Details**: Convert from a card with a grid of inputs to an inline-editable section. Show client name + key details in a compact read-mode display. Click to expand into edit mode. This saves vertical space when the user is focused on line items.

### File: `src/components/quotes/QuoteClientCard.tsx`

Redesign as a collapsible section with a compact "preview" mode showing "John Smith | john@email.com | 0412 345 678" in one line, expandable to the full edit grid.

### File: `src/components/quotes/QuoteSummaryPanel.tsx`

Convert from a sidebar card stack to a sticky bottom bar on desktop:
- Single row showing: Subtotal | Margin % | GST | **Total** (highlighted)
- Status change buttons become a dropdown from the status indicator in the header
- Notes, terms, valid-until move into a "Details" collapsible section under the client card
- Save button stays in the header
- Preview PDF button moves to the header as an icon button

### File: `src/components/quotes/QuoteLineItemsTable.tsx`

**Desktop table overhaul**:
- Remove the column resize handles (adds complexity for little value)
- Remove the custom `useIsMobile` hook (use the existing one from `use-mobile.tsx`)
- Cleaner header row: lighter weight, no uppercase tracking
- Description column gets more space (50%+ of width)
- Numeric columns use compact widths with no padding bloat
- Footer "Add Item" and "From Price Book" buttons become a single row with better spacing
- Remove the border/rounded-lg wrapper -- use a clean flat table style like Google Sheets

**Mobile card overhaul**:
- Each parent becomes a card with description + total on the main line
- Numeric fields shown in a 2-column grid (not 3) with larger touch targets (h-11 minimum)
- Qty and Sell on the first row (most used), Cost and Margin on the second row
- Hours gets its own row or is hidden behind a "More fields" toggle
- Sub-items shown as indented rows within the parent card with a subtle left border
- Action menu (three dots) is more prominent and always visible

### File: `src/components/quotes/QuoteLineItemRow.tsx`

**Desktop row cleanup**:
- Remove the arrow up/down buttons visual clutter -- replace with a subtle drag handle that only appears in a dedicated "reorder mode" or use a simpler right-click context menu for reorder
- Actually: keep the reorder arrows but make them appear only in the first column on hover, stacked vertically with smaller icons
- Description input: full borderless, only shows border on focus (Google Sheets style)
- Number inputs: same borderless style, right-aligned, monospace
- Actions column: single three-dot menu (already done)
- Parent rows with children: subtle background tint, bold description
- Child rows: left indent with a thin vertical line connector

---

## Phase 3: Quote Preview Overhaul

### File: `src/pages/QuotePreview.tsx`

**Toolbar**: Convert from a flat row of toggles to a clean popover/dropdown panel. Single "Display Options" button in the header that opens a settings panel. This declutters the preview view.

**Header**: Combine with existing header. Quote number + status + "Display Options" button + "Print / PDF" button. Clean and minimal.

### File: `src/components/quotes/preview/PreviewToolbar.tsx`

Redesign as a popover panel that opens from a settings icon, containing:
- Toggles organized in labeled groups with proper spacing
- "Parent Items" section with Qty and Pricing toggles
- "Sub-items" section with Show/Hide master toggle, then Qty and Pricing sub-toggles
- Visual preview indicator showing which columns are visible

---

## Phase 4: Build Error Fixes

These pre-existing build errors must also be fixed:

### File: `src/components/editor/MobileSidebarDrawer.tsx`
- Line 117: Change `pixelsPerMeter` to `pixelsPerMm`
- Lines 118, 310: Fix function call argument count

### File: `src/hooks/usePriceBook.ts`
- Line 135: Fix the insert call -- the object literal structure needs to match the Supabase type (wrap in array or fix property names)
- Line 170: Cast `specs` to `Json` type to fix the type incompatibility

---

## Phase 5: Print CSS Polish

### File: `src/styles/quote-print.css`

- Clean up print styles to match the new on-screen design
- Ensure all print colors use hardcoded values (not CSS variables)
- Add proper page-break rules for all sections

---

## Technical Details

### Files to Modify

| File | Scope |
|------|-------|
| `src/pages/QuotesList.tsx` | Full rewrite of layout: inline stats, chip filters, cleaner quote rows |
| `src/pages/QuoteEditor.tsx` | Layout restructure: remove sidebar, add bottom summary bar, collapsible client section |
| `src/pages/QuotePreview.tsx` | Toolbar becomes popover, cleaner header |
| `src/components/quotes/QuoteLineItemRow.tsx` | Cleaner inputs, better spacing, hover-only reorder arrows |
| `src/components/quotes/QuoteLineItemsTable.tsx` | Remove resize handles, use shared `useIsMobile`, 2-col mobile grid, flat table style |
| `src/components/quotes/QuoteSummaryPanel.tsx` | Convert to bottom bar with inline totals + collapsible details |
| `src/components/quotes/QuoteClientCard.tsx` | Add compact preview mode with expand/collapse |
| `src/components/quotes/QuoteStatusBadge.tsx` | Minimal dot + text style |
| `src/components/quotes/preview/PreviewToolbar.tsx` | Convert to popover panel |
| `src/components/editor/MobileSidebarDrawer.tsx` | Fix build errors |
| `src/hooks/usePriceBook.ts` | Fix TypeScript type errors |
| `src/styles/quote-print.css` | Polish print styles |

### Key Design Tokens

- Card shadows: `shadow-sm` (subtle elevation instead of borders)
- Input style: `border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:ring-1`
- Section spacing: `space-y-6` between major sections, `space-y-3` within
- Mobile tap targets: minimum `h-11` (44px)
- Typography: Description text `text-sm`, numbers `text-sm font-mono`, labels `text-xs text-muted-foreground`
- Active filter: `bg-primary/10 text-primary` pill with `rounded-full`

### No New Dependencies

Everything uses existing Radix UI components (Popover, Collapsible, Tabs) and Tailwind classes. No new packages needed.

