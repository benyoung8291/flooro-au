

# Professional Quote PDF Redesign -- Letterhead Style

This plan completely redesigns the quote PDF to look like a professional company letterhead document, with the scope/description presented as a letter to the customer, and comprehensive company + quote owner contact information.

---

## Database Changes

Two new columns are needed to support the additional business information:

### Organizations table
- Add `abn` column (text, nullable) -- Australian Business Number

### Profiles table
- Add `phone` column (text, nullable) -- so the quote owner's phone number can appear on the PDF

---

## Settings Page Updates

### Organization Settings (Settings.tsx)
- Add a new "ABN" field in the Company details section, between Company Name and the Email/Phone row

### Profile Settings (Settings.tsx)
- Add a "Phone" field in the Profile tab so users can set their direct phone number
- Wire it to the `useUpdateProfile` hook which needs updating to support the new field

---

## Hook Updates

### useOrganizationBranding.ts
- Add `abn` to the select query and interface so it's available on the PDF

### useUserProfile.ts
- Add `phone` to the Profile interface
- Update `useUpdateProfile` to accept `phone` in its partial updates

### New: useQuoteOwnerProfile.ts
- A small hook that fetches the `profiles` record for the quote's `created_by` user ID
- Returns the owner's `full_name`, `email`, and `phone`
- Used on the PDF preview to display the quote owner's contact details

---

## PDF Layout Redesign (QuotePreview.tsx + quote-print.css)

The current PDF has a functional but generic layout. The new design follows a professional letterhead structure:

### New Document Structure

```text
+------------------------------------------------------------+
|  [LOGO]  COMPANY NAME                                      |
|  ABN: 12 345 678 901                                       |
|  123 Business St, City STATE 1234                           |
|  P: (02) 1234 5678  |  E: info@co.com  |  W: co.com       |
+------------------------------------------------------------+
|                                                             |
|  QUOTE #Q-0042                    Date: 8 February 2026     |
|                                   Valid Until: 8 March 2026 |
|                                                             |
+-------------------------------+-----------------------------+
|  PREPARED FOR                 |  YOUR CONTACT               |
|  Client Name                  |  John Smith                 |
|  123 Client Address           |  john@company.com           |
|  client@email.com             |  0412 345 678               |
|  0400 000 000                 |                             |
+-------------------------------+-----------------------------+
|                                                             |
|  Dear Client Name,                                          |
|                                                             |
|  [Rich text scope/description rendered as a letter body]    |
|  Thank you for the opportunity to provide this quote...     |
|                                                             |
+------------------------------------------------------------+
|                                                             |
|  QUOTED ITEMS                                               |
|  [Table with items]                                         |
|                                                             |
+------------------------------------------------------------+
|                                     Subtotal    $X,XXX.XX   |
|                                     GST (10%)   $XXX.XX     |
|                                     TOTAL       $X,XXX.XX   |
+------------------------------------------------------------+
|                                                             |
|  NOTES                                                      |
|  [Client notes text]                                        |
|                                                             |
+------------------------------------------------------------+
|  TERMS & CONDITIONS                                         |
|  [Terms text in smaller font]                               |
|                                                             |
+------------------------------------------------------------+
|                                                             |
|  ___________________        ___________________             |
|  Client Signature/Date      Company Rep/Date                |
|                                                             |
+------------------------------------------------------------+
|  Company Name  |  ABN: XX XXX XXX XXX  |  phone  |  email   |
+------------------------------------------------------------+
```

### Key Design Changes

1. **Letterhead header**: Company logo, name, ABN, and full contact details in a clean horizontal bar with a primary-colored bottom border. No more emoji icons -- use clean text separators.

2. **Quote metadata bar**: Quote number displayed prominently as a large label on the left, with date and validity on the right. Clean horizontal layout instead of stacked right-aligned text.

3. **Two-column contact section**: "Prepared For" (client) on the left, "Your Contact" (quote owner) on the right. Both in clean bordered boxes.

4. **Letter-style scope**: The description/scope is rendered as a letter body below the contact section, starting with "Dear [Client Name]," if a client name exists. The rich text HTML is rendered with proper typography. This replaces the cramped "Project" info box.

5. **Clean table styling**: Remove the colored info-box styling. Use clean black/gray lines, uppercase headers, and good spacing. Professional accounting-style table.

6. **Totals**: Right-aligned summary box with clean lines. The grand total row uses a dark background (slate/charcoal) instead of the primary amber color, for a more professional look.

7. **Footer**: Repeats company name, ABN, phone, and email in a single line at the page bottom -- standard letterhead footer.

8. **Print colors**: Switch from amber/orange primary to a neutral charcoal/slate palette for print. This looks more professional and prints well in grayscale. The primary color is only used for the header accent line.

---

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add `abn` to organizations, `phone` to profiles |
| `src/hooks/useOrganizationBranding.ts` | Add `abn` to select and interface |
| `src/hooks/useUserProfile.ts` | Add `phone` to Profile interface and update mutation |
| `src/hooks/useQuoteOwnerProfile.ts` | **New** -- fetch quote creator's profile for PDF |
| `src/pages/Settings.tsx` | Add ABN field in Company tab, Phone field in Profile tab |
| `src/pages/QuotePreview.tsx` | Complete restructure to letterhead layout with owner info |
| `src/styles/quote-print.css` | Complete rewrite for professional letterhead styling |

---

## Technical Details

### Database Migration SQL

```sql
ALTER TABLE public.organizations ADD COLUMN abn text;
ALTER TABLE public.profiles ADD COLUMN phone text;
```

No RLS changes needed -- existing policies already cover these tables appropriately.

### Quote Owner Profile Hook

```typescript
// Fetches the profile of the user who created the quote
// Uses the quote's created_by field to look up the profile
export function useQuoteOwnerProfile(createdBy: string | undefined) {
  return useQuery({
    queryKey: ['profile', createdBy],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', createdBy)
        .single();
      return data;
    },
    enabled: !!createdBy,
  });
}
```

### CSS Approach

The print CSS will use hardcoded colors (no CSS variables) for reliable printing:
- Header accent: `#1a1a1a` (near black) with a thin primary-colored line
- Text: `#1a1a1a` for headings, `#4a4a4a` for body, `#6b7280` for labels
- Borders: `#e5e7eb` for table lines, `#d1d5db` for section dividers
- Grand total row: `#1e293b` (slate-800) background with white text
- All backgrounds use `print-color-adjust: exact` for reliable output

### Removing Emoji Icons

All emoji icons (phone, mail, globe, pin) are replaced with clean text labels or simple Unicode characters that print reliably. Example: `Ph: (02) 1234 5678` instead of `📞 (02) 1234 5678`.

