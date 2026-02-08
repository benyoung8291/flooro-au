

# App Layout Redesign -- Persistent Sidebar Navigation

This redesign transforms the app from a header-button navigation pattern into a professional sidebar-based layout matching the reference (Pulse). Every page gets a persistent left sidebar with grouped navigation, a clean top header bar, and a white content area that is easier to read.

---

## Current vs. New Layout

**Current**: Each page (Dashboard, Materials, PriceBook, Quotes, Settings) has its own standalone header with back buttons and inline navigation. No persistent sidebar. Users must navigate back to the Dashboard to switch sections.

**New**: A shared app shell wraps all protected pages with:
- A fixed left sidebar (collapsible) with grouped navigation links
- A compact top header with search, user info, and theme toggle
- A clean white content area that fills the remaining space

---

## Architecture

### New Shared Layout Component (`AppLayout.tsx`)

A new wrapper component that renders:
1. **Left Sidebar** (240px, collapsible to icon-only ~60px)
2. **Right content area** with:
   - A slim top header bar (search, user avatar, theme toggle, sign out)
   - The page content via `<Outlet />`

### Routing Change

Instead of each page rendering its own header, the `ProtectedRoute` component will render the `AppLayout` which wraps all child routes via `<Outlet />`. Pages like Dashboard, QuotesList, QuoteEditor, Materials, PriceBook, and Settings all render inside this shell.

**Exception**: The ProjectEditor page keeps its own full-screen layout (it needs the canvas and its own toolbar/sidebar), so it will be rendered outside the shared layout.

---

## Sidebar Navigation Groups

Based on the reference and Flooro's existing features:

```text
Flooro [logo]
---------------------------------
Dashboard

Estimating
  - Projects
  - Materials
  - Price Book

Quoting
  - Quotes

Admin (if platform admin)
  - Organizations

---------------------------------
Settings
Collapse toggle
```

The active page is highlighted with a background accent. Groups are collapsible sections with small arrows.

---

## Design & Colors

The sidebar and header will use:
- **Sidebar**: White/card background (`bg-card`), `border-r border-border` separator
- **Active link**: `bg-primary/10 text-primary` with a left border accent
- **Inactive links**: `text-muted-foreground hover:bg-muted/50 hover:text-foreground`
- **Group labels**: Uppercase, small, `text-muted-foreground`, spaced above each section
- **Header**: White/card background, slim (h-14), `border-b border-border`
- **Content**: `bg-background` (the warm cream), padded
- **Collapse**: Sidebar can be toggled between full (240px) and collapsed (icon-only, 60px). Stores preference in localStorage.

This matches the clean, white, highly readable aesthetic from the reference screenshot.

---

## Quote Editor Page Improvements

The quote editor page itself (the one the user is currently viewing) will be cleaned up to better match the reference:

### Quote Header Section
- Show the quote title prominently at the top with the status badge, quote number, and dates
- Client/customer details shown as a compact info bar below the title (like the reference's "Customer | Lead | Address" row)
- Summary stats bar: items count, total ex GST, margin -- all inline

### Horizontal Tab Bar
- Replace the current single-scroll layout with a horizontal tab bar below the header:
  - **Line Items** (default active tab)
  - **Details** (client info, description/scope)
  - **Notes** (client notes, internal notes, terms)
- This separates concerns and reduces vertical scrolling

### Line Items Table
- Keep the current clean table layout (it already matches the reference well)
- The "Add Line" button at the bottom matches the reference
- Action buttons (Price Book, Save as Template) shown as pill buttons above the table, similar to the reference toolbar row

### Totals Section
- Move the totals summary from the fixed bottom bar to an inline right-aligned section below the table (matching the reference: Subtotal, Tax, Total aligned right)
- Keep the status/save/preview actions in the bottom bar but make it slimmer

---

## Files to Create / Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/layout/AppLayout.tsx` | **Create** | Shared sidebar + header + outlet layout shell |
| `src/components/layout/AppSidebar.tsx` | **Create** | Sidebar navigation with grouped links, collapse toggle, active state |
| `src/components/layout/AppHeader.tsx` | **Create** | Top header bar with search, user info, theme toggle |
| `src/App.tsx` | **Modify** | Wrap protected routes in AppLayout, keep ProjectEditor outside |
| `src/components/ProtectedRoute.tsx` | **Modify** | Render AppLayout with Outlet instead of bare Outlet |
| `src/pages/Dashboard.tsx` | **Modify** | Remove standalone header, keep only the content section |
| `src/pages/QuotesList.tsx` | **Modify** | Remove standalone header, keep content |
| `src/pages/QuoteEditor.tsx` | **Modify** | Remove standalone header, restructure into tabbed layout with inline totals |
| `src/pages/Materials.tsx` | **Modify** | Remove standalone header, keep content |
| `src/pages/PriceBook.tsx` | **Modify** | Remove standalone header, keep content |
| `src/pages/Settings.tsx` | **Modify** | Remove standalone header, keep content |
| `src/components/quotes/QuoteSummaryPanel.tsx` | **Modify** | Convert from fixed bottom bar to inline totals + slimmer action bar |
| `src/index.css` | **Minor** | No major changes needed -- sidebar uses existing CSS variables |

---

## Technical Details

### AppLayout Structure

```tsx
function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => 
    localStorage.getItem('sidebar-collapsed') === 'true'
  );
  
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### Routing Changes in App.tsx

```tsx
<Route element={<ProtectedRoute />}>
  {/* Full-screen editor -- outside AppLayout */}
  <Route path="/projects/:projectId" element={<ProjectEditor />} />
  <Route path="/quotes/:quoteId/preview" element={<QuotePreview />} />
  
  {/* App shell with sidebar -- wraps all other pages */}
  <Route element={<AppLayout />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/onboarding" element={<Onboarding />} />
    <Route path="/projects/new" element={<NewProject />} />
    <Route path="/materials" element={<Materials />} />
    <Route path="/price-book" element={<PriceBook />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="/quotes" element={<QuotesList />} />
    <Route path="/quotes/:quoteId" element={<QuoteEditor />} />
  </Route>
</Route>
```

### Sidebar Navigation Config

```tsx
const NAV_GROUPS = [
  {
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ],
  },
  {
    label: 'Estimating',
    items: [
      { label: 'Projects', icon: FolderOpen, path: '/dashboard' },
      { label: 'Materials', icon: Package, path: '/materials' },
      { label: 'Price Book', icon: BookOpen, path: '/price-book' },
    ],
  },
  {
    label: 'Quoting',
    items: [
      { label: 'Quotes', icon: FileText, path: '/quotes' },
    ],
  },
];
```

### Mobile Responsive Behavior

On mobile (< 768px):
- Sidebar is hidden by default, toggled via a hamburger button in the header
- Uses a sheet/drawer overlay pattern
- Content takes full width

### Quote Editor Tab Restructure

The QuoteEditor page will be reorganized with tabs:
- **Line Items tab**: The table, action buttons (Price Book, Add Item), and inline totals at the bottom right
- **Details tab**: Client name, email, phone, address fields + the rich text description/scope
- **Notes tab**: Client notes, internal notes, terms and conditions

This reduces clutter and matches the tabbed interface pattern from the reference.

### Inline Totals (Replacing Fixed Bottom Bar)

The totals (Subtotal, Tax, Total) move from the fixed bottom bar into the Line Items tab, right-aligned below the table. The bottom bar is simplified to just show the save button, status dropdown, and preview link -- or removed entirely in favor of header actions.

