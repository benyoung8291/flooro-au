

# Complete Quote System Overhaul (Updated from FieldFlow Reference)

## Overview

Replace the current dialog-based `QuoteSummaryDialog.tsx` with a full standalone quoting system modeled on the FieldFlow reference app. The new system uses persistent database-backed quotes with a parent/child line item hierarchy, inline editing, Price Book integration, margin calculations, and a professional PDF preview -- all as dedicated pages that work both standalone and when linked to takeoff projects.

---

## Part 1: Database Schema

### `quotes` table

Closely mirrors the FieldFlow `quotes` table, adapted to Flooro's `organization_id` model (instead of FieldFlow's `tenant_id`).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| organization_id | uuid | FK to organizations |
| project_id | uuid | FK to projects, nullable (standalone quotes have no project) |
| quote_number | text | Auto-generated sequential (Q-0001) |
| status | text | draft, sent, accepted, declined, expired |
| title | text | nullable, e.g. "Flooring Quote - Level 2 Office" |
| description | text | nullable, scope of works / rich description |
| client_name | text | nullable |
| client_email | text | nullable |
| client_phone | text | nullable |
| client_address | text | nullable, site/delivery address |
| subtotal | numeric | default 0 |
| total_cost | numeric | default 0, sum of cost side for margin tracking |
| total_margin | numeric | default 0, calculated margin % |
| tax_rate | numeric | default 10 (GST) |
| tax_amount | numeric | default 0 |
| total_amount | numeric | default 0, grand total |
| valid_until | date | nullable |
| notes | text | nullable, shown on PDF |
| internal_notes | text | nullable, NOT shown on PDF |
| terms_and_conditions | text | nullable |
| estimated_hours | numeric | default 0 |
| version | integer | default 1 |
| parent_quote_id | uuid | nullable, FK to quotes (revision tracking) |
| created_by | uuid | FK to auth.users |
| sent_at | timestamptz | nullable |
| approved_at | timestamptz | nullable |
| rejected_at | timestamptz | nullable |
| rejection_reason | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `quote_line_items` table

Direct match to FieldFlow's parent/child model using `parent_line_item_id`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK |
| quote_id | uuid | FK to quotes |
| parent_line_item_id | uuid | FK to self, nullable (null = parent row) |
| description | text | Line item name/description |
| quantity | numeric | default 1 |
| cost_price | numeric | default 0, buy/cost per unit |
| sell_price | numeric | default 0, sell per unit |
| margin_percentage | numeric | default 0, auto-calculated |
| unit_price | numeric | default 0, legacy/display price |
| line_total | numeric | default 0, qty x sell_price |
| estimated_hours | numeric | default 0 |
| item_order | integer | default 0, sort order |
| is_optional | boolean | default false |
| is_active | boolean | default true (soft delete) |
| price_book_item_id | uuid | nullable, FK to price_book_items |
| is_from_price_book | boolean | default false |
| source_room_id | text | nullable, links to takeoff room ID |
| metadata | jsonb | default '{}', flexible (waste %, OOH flag, etc.) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### RLS Policies

Same pattern as existing tables -- org members can read/write their own org's quotes. Read-only for non-admin roles where appropriate.

### Database Function: `generate_quote_number(org_id uuid)`

Returns the next sequential quote number formatted as `Q-NNNN`, incrementing from the highest existing number for that organization.

---

## Part 2: Quote Hooks (Following FieldFlow's `useSimpleQuoteLineItems` Pattern)

### `src/hooks/useQuotes.ts`

A comprehensive hook file containing:

- **`useQuotes(statusFilter?)`** -- List all org quotes, filterable by status
- **`useQuote(quoteId)`** -- Single quote with full header data
- **`useCreateQuote()`** -- Create quote (standalone or project-linked), calls `generate_quote_number` RPC
- **`useUpdateQuote()`** -- Update quote header fields (client info, status, totals, notes)
- **`useDeleteQuote()`** -- Soft delete / archive
- **`useDuplicateQuote()`** -- Clone a quote with a new number and version

### `src/hooks/useQuoteLineItems.ts`

Modeled directly on FieldFlow's `useSimpleQuoteLineItems.ts`:

- Fetches line items and organizes into parent/child `LineItem[]` structure using `parent_line_item_id`
- Maintains local `editedLineItems` state for editing before explicit save
- `hasUnsavedChanges` detection by comparing JSON snapshots
- `saveLineItems()` -- flattens hierarchy, diffs against DB (insert/update/delete), saves in batch
- `addLineItem()` / `removeLineItem()` / `addSubItem()` / `removeSubItem()`
- `duplicateLineItem()` for quick copying
- localStorage auto-backup every 30 seconds as safety net
- Pricing calculation helpers: when cost or margin changes, sell price auto-calculates (and vice versa), matching FieldFlow's `calculatePricing` logic

### `src/hooks/useGenerateQuoteFromProject.ts`

Converts takeoff project data into a hierarchical quote:
1. Creates a new quote linked to the project
2. For each room with a material assigned, creates a parent line item (room name)
3. Under each room parent, creates child items for:
   - Material (qty = order m2, cost/sell from material)
   - Installation (if room has installCost set)
   - Each enabled accessory (coving, weld rod, etc.)
4. Pre-fills client details and site address from the project

---

## Part 3: Quotes List Page (`/quotes`)

A dedicated dashboard for all quotes, matching FieldFlow's `Quotes.tsx`:

- **Status filter tabs**: All | Draft | Sent | Accepted | Declined | Expired
- **Search bar**: Filter by client name, quote number, or title
- **Quick stats row**: Total quoted value, number by status, acceptance rate
- **Quote cards**: Each showing quote number, client name, title, status badge, total amount, date, and actions dropdown (Edit, Duplicate, Delete)
- **"New Quote" button** in the header
- **Create Quote dialog**: Simple dialog to set a title and optionally link to a project, then navigates to the editor

---

## Part 4: Quote Editor Page (`/quotes/:quoteId`)

The main editing interface -- a dedicated full page modeled on FieldFlow's `QuoteDetails.tsx`. This is the core of the system.

### Layout (Two-Column Desktop)

```text
+----------------------------------------------------------+
| Header: Quote Q-0042  |  Status Badge  |  Save | Actions |
+----------------------------------------------------------+
| Left Column (70%)          | Right Column (30%)          |
|                            |                             |
| Client Details Card        | Quote Summary Card          |
|   Name, Email, Phone,      |   Total Cost                |
|   Site Address              |   Total Sell                |
|   (inline editable)        |   Margin %                  |
|                            |   Tax (GST 10%)             |
| Line Items Table           |   GRAND TOTAL               |
|   [Parent] Living Room     |                             |
|     - Material 24.5m2      | Estimated Hours             |
|     - Installation 24.5m2  |                             |
|     - Wall Coving 19.2m    | Notes                       |
|     - Weld Rod 14.3m       |   (internal + client)       |
|   [Parent] Hallway         |                             |
|     - Material 12.0m2      | Terms & Conditions          |
|     - Installation 12.0m2  |                             |
|   [Parent] Additional      | Valid Until                 |
|     - Floor Leveller x5    |                             |
|                            | Actions:                    |
| + Add Line Item            |   Save Draft                |
| + Add from Price Book      |   Preview PDF               |
|                            |   Mark as Sent              |
|                            |   Mark as Accepted          |
+----------------------------------------------------------+
```

### Line Items Table (Matching FieldFlow's `InlineQuoteLineItems.tsx`)

Each line item row has these columns:
- **Description** (text input, full width for parents)
- **Qty** (numeric input)
- **Cost** (numeric input, cost price per unit)
- **Margin %** (numeric input, auto-calculated when sell changes)
- **Sell** (numeric input, auto-calculated when margin changes)
- **Total** (read-only, qty x sell)
- **Actions** (delete, add sub-item)

Key behaviors from FieldFlow:
- **Parent rows** are bold, with a chevron to expand/collapse children
- **Child rows** are indented with a left border/padding
- **Parent totals** aggregate from children (no direct qty/cost on parents with children)
- **Margin calculation**: Changing cost recalculates sell (keeping margin fixed). Changing sell recalculates margin. Changing margin recalculates sell.
- **"Add Line Item"** button adds a new parent row
- **"Add Sub-Item"** button on each parent adds a child
- **"Add from Price Book"** opens a picker dialog to select from price_book_items, auto-filling description, cost, sell, and margin
- **Delete** with confirmation for parents (warns about child deletion)
- **Optional items**: Toggle to mark items as optional (shown in italics, excluded from totals)

### Unsaved Changes Warning

- `hasUnsavedChanges` indicator in the header (dot or badge)
- Browser `beforeunload` warning when navigating away with unsaved changes
- Explicit "Save" button (not auto-save, matching FieldFlow's approach)

### Status Workflow

Draft -> Sent -> Accepted/Declined/Expired

Status transitions via action buttons in the summary panel and header dropdown.

---

## Part 5: Quote Preview / PDF (`/quotes/:quoteId/preview`)

A print-optimized page for professional quote output:

- Company branding header (from organization settings via `CompanyBrandingForm`)
- Quote number, date, valid until
- Client name, email, phone, site address
- Line items table with parent/child hierarchy (indented sub-items)
- Optional items in a separate "Optional Items" section
- Cost summary: Subtotal, Tax (GST), Total
- Notes and Terms & Conditions
- Uses browser `window.print()` for PDF generation (matching current approach)

---

## Part 6: Project Integration

### TakeoffPanel Changes

Replace the "Quote Summary" dialog trigger with a "Generate Quote" button that:
1. Calls `useGenerateQuoteFromProject` to create a new quote pre-populated from the takeoff
2. Navigates to `/quotes/:newQuoteId` for full editing
3. If a quote already exists for this project, shows "View Quote" instead

### Dashboard Changes

Add a "Quotes" navigation button alongside "Materials" and "Price Book" on the Dashboard header.

---

## Files to Create

| File | Purpose |
|------|---------|
| Migration SQL | `quotes` table, `quote_line_items` table, RLS policies, `generate_quote_number` function |
| `src/hooks/useQuotes.ts` | Quote CRUD hooks |
| `src/hooks/useQuoteLineItems.ts` | Line item management following FieldFlow's `useSimpleQuoteLineItems` pattern |
| `src/hooks/useGenerateQuoteFromProject.ts` | Convert takeoff data to quote |
| `src/pages/QuotesList.tsx` | Quotes dashboard/list page |
| `src/pages/QuoteEditor.tsx` | Main quote editing page (following FieldFlow's QuoteDetails pattern) |
| `src/pages/QuotePreview.tsx` | Print-optimized preview |
| `src/components/quotes/QuoteLineItemsTable.tsx` | Hierarchical line items table (following FieldFlow's InlineQuoteLineItems) |
| `src/components/quotes/QuoteLineItemRow.tsx` | Individual row (parent or child) |
| `src/components/quotes/QuoteSummaryPanel.tsx` | Right sidebar totals/actions panel |
| `src/components/quotes/QuoteClientCard.tsx` | Client details section |
| `src/components/quotes/QuoteStatusBadge.tsx` | Reusable status badge |
| `src/components/quotes/PriceBookPickerDialog.tsx` | Dialog to pick from price book |
| `src/components/quotes/CreateQuoteDialog.tsx` | New quote creation dialog |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/quotes`, `/quotes/:quoteId`, `/quotes/:quoteId/preview` routes |
| `src/pages/Dashboard.tsx` | Add "Quotes" nav button |
| `src/components/editor/TakeoffPanel.tsx` | Replace "Quote Summary" dialog with "Generate Quote" button |

## Files to Deprecate

| File | Reason |
|------|--------|
| `src/components/reports/QuoteSummaryDialog.tsx` | Replaced by full QuoteEditor page |

---

## Implementation Order

Due to the size, this will be broken into phases:

**Phase 1 -- Database and Core Hooks**
1. Create database migration (quotes + quote_line_items tables, RLS, generate_quote_number function)
2. Create `useQuotes.ts` hook (CRUD operations)
3. Create `useQuoteLineItems.ts` hook (parent/child management, save/load, pricing calculations)

**Phase 2 -- Quotes List Page**
4. Create `QuotesList.tsx` with status filtering, search, and stats
5. Create `CreateQuoteDialog.tsx`
6. Create `QuoteStatusBadge.tsx`
7. Add routes to `App.tsx` and nav button to Dashboard

**Phase 3 -- Quote Editor**
8. Create `QuoteLineItemsTable.tsx` with parent/child hierarchy, inline editing, margin calculations
9. Create `QuoteLineItemRow.tsx` for individual rows
10. Create `QuoteSummaryPanel.tsx` for totals and actions
11. Create `QuoteClientCard.tsx` for client details
12. Create `PriceBookPickerDialog.tsx` for adding items from price book
13. Create `QuoteEditor.tsx` composing all the above

**Phase 4 -- Project Integration**
14. Create `useGenerateQuoteFromProject.ts`
15. Update `TakeoffPanel.tsx` to add "Generate Quote" flow

**Phase 5 -- Preview and PDF**
16. Create `QuotePreview.tsx` with print-optimized layout

