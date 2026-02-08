
-- Create price_book_items table
CREATE TABLE public.price_book_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_global BOOLEAN NOT NULL DEFAULT false,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  pricing_type TEXT NOT NULL DEFAULT 'per_m2',
  cost_rate NUMERIC NOT NULL DEFAULT 0,
  sell_rate NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_book_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern as materials table)
CREATE POLICY "Users can view price book items"
ON public.price_book_items
FOR SELECT
USING (
  (is_global = true)
  OR (organization_id = get_user_org_id(auth.uid()))
  OR is_platform_admin(auth.uid())
);

CREATE POLICY "Users can create org price book items"
ON public.price_book_items
FOR INSERT
WITH CHECK (
  (organization_id = get_user_org_id(auth.uid()))
  AND (is_global = false)
);

CREATE POLICY "Users can update org price book items"
ON public.price_book_items
FOR UPDATE
USING (
  ((organization_id = get_user_org_id(auth.uid())) AND (is_global = false))
  OR is_platform_admin(auth.uid())
);

CREATE POLICY "Users can delete org price book items"
ON public.price_book_items
FOR DELETE
USING (
  ((organization_id = get_user_org_id(auth.uid())) AND (is_global = false))
  OR is_platform_admin(auth.uid())
);

-- Auto-update updated_at trigger
CREATE TRIGGER update_price_book_items_updated_at
  BEFORE UPDATE ON public.price_book_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
