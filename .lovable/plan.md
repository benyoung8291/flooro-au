

# Quote Editor: Details Tab and Layout Optimisation

Three changes to streamline the quote editor layout based on the screenshot reference.

---

## 1. Remove the "Quote Title" section from the Details tab

The `QuoteClientCard` component currently renders a "Quote Title" label and input at the top (lines 37-47). Since the title is already editable via the `QuoteEditorHeader` component above the tabs, this is redundant and will be removed.

**File**: `src/components/quotes/QuoteClientCard.tsx`
- Remove the `title` prop and its debounced field
- Remove the "Quote Title" section (lines 37-47)
- Remove the `titleField` from `useDebouncedField`

**File**: `src/pages/QuoteEditor.tsx`
- Remove the `title` prop from `QuoteClientCard` (line 339)

---

## 2. Move client details above the tabbed menu

The client details form (name, email, phone, address) will move from the Details tab into the `QuoteEditorHeader` component, sitting directly below the title and always visible.

**File**: `src/components/quotes/QuoteEditorHeader.tsx`
- Add client detail fields (name, email, phone, address) as compact inline inputs
- Display as a 2x2 or 4-column grid of small labeled inputs with icons
- Use `useDebouncedField` for each field (same pattern as `QuoteClientCard`)
- Add the required props: `client_phone` and update callbacks

**File**: `src/pages/QuoteEditor.tsx`
- Pass the full quote object (or the additional client fields) to `QuoteEditorHeader`
- The "Details" tab content will now only contain the Scope/Description editor

**File**: `src/components/quotes/QuoteClientCard.tsx`
- Rename to something like `QuoteScopeCard` or simplify it
- Remove all client field inputs (they moved to the header)
- Keep only the Scope/Description `RichTextEditor` with a white background wrapper

---

## 3. Add white background behind Scope/Description

The rich text editor for scope/description currently sits on the cream page background. It will be wrapped in a white container.

**File**: `src/pages/QuoteEditor.tsx` (Details tab)
- Wrap the scope/description content in a `bg-white dark:bg-card rounded-lg border border-border/40 p-4` container

---

## Technical Details

### QuoteEditorHeader.tsx -- updated component

The header will expand to include compact client fields:

```text
+------------------------------------------+
| [Title input - "Untitled Quote"]         |
| +------+-------+--------+---------+     |
| | Name | Email | Phone  | Address |     |
| +------+-------+--------+---------+     |
+------------------------------------------+
```

- Each field uses a small `h-8` input with an icon and muted label
- Fields are displayed in a responsive grid: 4 columns on desktop, 2 on mobile
- The component will accept the full set of client fields plus `onUpdate`

### QuoteClientCard.tsx -- simplified to scope only

After removing title and client fields, the Details tab content becomes:

```tsx
<div className="space-y-2">
  <Label className="text-xs text-muted-foreground">Scope / Description</Label>
  <div className="bg-white dark:bg-card rounded-lg border border-border/40 p-4">
    <RichTextEditor
      value={description}
      onChange={(html) => onUpdate({ description: html })}
      placeholder="Add a scope or description..."
    />
  </div>
</div>
```

### QuoteEditor.tsx -- updated layout structure

```text
+-------------------------------------+
| Quote header (number, status, save) |
+-------------------------------------+
| [Title input]                       |
| [Name] [Email] [Phone] [Address]   |  <-- client fields always visible
+-------------------------------------+
| [Line Items] [Details] [Notes]      |
+-------------------------------------+
| Details tab -> Scope/Description    |
|   in white box                      |
+-------------------------------------+
```

### Files modified

| File | Changes |
|------|---------|
| `src/components/quotes/QuoteEditorHeader.tsx` | Add client detail input fields (name, email, phone, address) with debounced updates |
| `src/components/quotes/QuoteClientCard.tsx` | Remove title section and client fields; keep only Scope/Description with white background |
| `src/pages/QuoteEditor.tsx` | Update props passed to header and client card components |

