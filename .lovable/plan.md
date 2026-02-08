

# Fix Line Items Background to White

The issue is that the line items table background appears as the warm cream color (`hsl(40, 33%, 97%)`) because both the page background and the table rows use the same `bg-background` CSS variable. The user wants the table area to be white, like in the reference screenshot.

---

## What needs to change

### 1. Quote Editor content area (`QuoteEditor.tsx`)
- Wrap the Line Items tab content (table + totals) in a white card/container using `bg-white` (or `bg-card` which maps to near-white `hsl(40, 33%, 99%)`).
- This creates a visual lift effect: cream page background with a white content card on top -- exactly matching the reference where the table sits on a distinct white surface.

### 2. Table row backgrounds (`QuoteLineItemRow.tsx`)
- Change the `<tr>` class from `bg-background` to `bg-white` so each row is explicitly white, not cream.

### 3. Table header row (`QuoteLineItemsTable.tsx`)
- Change the `<thead>` row from `bg-background` to `bg-white` to match.

---

## Technical Details

### QuoteEditor.tsx (line ~277)
Wrap the Line Items `TabsContent` children in a white container:
```tsx
<TabsContent value="line-items" className="space-y-6">
  <div className="bg-white dark:bg-card rounded-lg">
    <QuoteLineItemsTable ... />
    <QuoteEditorTotals ... />
  </div>
</TabsContent>
```

### QuoteLineItemRow.tsx (line ~181)
Change `bg-background` to `bg-white dark:bg-card`:
```tsx
<tr className={cn(
  'group border-b border-border/40 transition-colors',
  'bg-white dark:bg-card',
  'hover:bg-muted/30',
  ...
)}>
```

### QuoteLineItemsTable.tsx (line ~508)
Change the header row from `bg-background` to `bg-white dark:bg-card`:
```tsx
<tr className="border-b border-border bg-white dark:bg-card">
```

This approach ensures the line items sit on a clean white surface while the surrounding page retains the warm cream tone -- creating the exact visual hierarchy seen in the reference screenshot.
