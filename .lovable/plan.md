

# Rich Text Toolbar Fix + Description Templates

Two changes: make the formatting toolbar always visible, and add the ability to save/load description templates from the database.

---

## 1. Always-visible formatting toolbar

Currently the toolbar in `RichTextEditor.tsx` is hidden (`opacity-0`, `pointer-events-none`) when the editor is not focused. This will be changed so the toolbar is always visible and clickable.

**File**: `src/components/quotes/RichTextEditor.tsx`
- Remove the conditional opacity/translate/pointer-events classes from the toolbar wrapper
- The toolbar will always render with `opacity-100` and be interactive regardless of focus state
- Keep the `onMouseDown preventDefault` pattern so clicking toolbar buttons doesn't blur the editor

---

## 2. Description templates (save and load)

### Database

Create a new `description_templates` table to store reusable scope/description templates per organization:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, default gen_random_uuid() |
| organization_id | uuid | Foreign key to organizations, NOT NULL |
| name | text | Template name, NOT NULL |
| content | text | HTML content of the template |
| created_by | uuid | User who created it |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

RLS policies:
- SELECT: users can read templates belonging to their organization
- INSERT: users can create templates for their organization
- UPDATE: users can update templates in their organization
- DELETE: users can delete templates in their organization

### New hook: `useDescriptionTemplates.ts`

A React Query hook providing:
- `useDescriptionTemplates()` -- fetches all templates for the user's organization
- `useSaveDescriptionTemplate()` -- mutation to insert a new template (name + content)
- `useDeleteDescriptionTemplate()` -- mutation to remove a template

### Updated UI: Template controls in `QuoteClientCard.tsx`

Add two buttons next to the "Scope / Description" label:
- **Save as Template** button -- opens a small dialog asking for a template name, then saves the current description HTML as a new template
- **Load Template** button -- opens a dropdown/popover listing saved templates. Clicking one replaces the current description content.

The layout will look like:

```text
Scope / Description          [Save as Template] [Load Template]
+----------------------------------------------------------+
| B  I  U  := :=                                           |
|                                                          |
| (rich text editor content)                               |
|                                                          |
+----------------------------------------------------------+
```

### Files to create/modify

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | `description_templates` table with RLS |
| `src/hooks/useDescriptionTemplates.ts` | Create | React Query hooks for CRUD |
| `src/components/quotes/RichTextEditor.tsx` | Modify | Make toolbar always visible |
| `src/components/quotes/QuoteClientCard.tsx` | Modify | Add Save/Load template buttons and dialogs |

---

## Technical Details

### RichTextEditor.tsx toolbar fix

Change line 80-83 from:
```tsx
'flex items-center gap-0.5 mb-1.5 transition-all',
isFocused ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
```
To:
```tsx
'flex items-center gap-0.5 mb-1.5'
```

The toolbar becomes a static, always-visible row of formatting buttons.

### useDescriptionTemplates.ts

```tsx
// useDescriptionTemplates() - query
queryKey: ['description-templates', profile?.organization_id]
queryFn: supabase.from('description_templates')
  .select('*')
  .eq('organization_id', orgId)
  .order('name')

// useSaveDescriptionTemplate() - mutation
mutationFn: insert { organization_id, name, content, created_by }

// useDeleteDescriptionTemplate() - mutation  
mutationFn: delete by id
```

### QuoteClientCard.tsx template UI

- A "Save as Template" ghost button triggers a small Dialog with a name input and save button
- A "Load Template" ghost button triggers a Popover with a scrollable list of template names
- Each template in the list shows the name and a delete icon button
- Selecting a template calls `onUpdate({ description: template.content })` to replace the editor content
- The save dialog captures the current `description` prop value and saves it with the entered name

### Database migration SQL

```sql
CREATE TABLE public.description_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  content text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.description_templates ENABLE ROW LEVEL SECURITY;

-- RLS: org members can read their org's templates
CREATE POLICY "Users can view own org templates"
  ON public.description_templates FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

-- RLS: org members can insert templates  
CREATE POLICY "Users can create templates"
  ON public.description_templates FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

-- RLS: org members can update templates
CREATE POLICY "Users can update own org templates"
  ON public.description_templates FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

-- RLS: org members can delete templates
CREATE POLICY "Users can delete own org templates"
  ON public.description_templates FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));
```

