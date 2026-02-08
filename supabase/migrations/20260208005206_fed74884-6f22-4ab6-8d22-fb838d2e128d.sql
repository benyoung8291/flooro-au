
-- =============================================
-- QUOTES TABLE
-- =============================================
CREATE TABLE public.quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  quote_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  title text,
  description text,
  client_name text,
  client_email text,
  client_phone text,
  client_address text,
  subtotal numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  total_margin numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 10,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  valid_until date,
  notes text,
  internal_notes text,
  terms_and_conditions text,
  estimated_hours numeric NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  parent_quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  sent_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using existing helper functions to avoid recursion)
CREATE POLICY "Users can view org quotes"
  ON public.quotes FOR SELECT
  USING (
    (organization_id = get_user_org_id(auth.uid()))
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Non-viewers can create org quotes"
  ON public.quotes FOR INSERT
  WITH CHECK (
    (organization_id = get_user_org_id(auth.uid()))
    AND (NOT has_role(auth.uid(), 'viewer'::app_role))
  );

CREATE POLICY "Non-viewers can update org quotes"
  ON public.quotes FOR UPDATE
  USING (
    ((organization_id = get_user_org_id(auth.uid()))
    AND (NOT has_role(auth.uid(), 'viewer'::app_role)))
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Admins can delete org quotes"
  ON public.quotes FOR DELETE
  USING (
    ((organization_id = get_user_org_id(auth.uid()))
    AND has_role(auth.uid(), 'admin'::app_role))
    OR is_platform_admin(auth.uid())
  );

-- =============================================
-- QUOTE LINE ITEMS TABLE
-- =============================================
CREATE TABLE public.quote_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  parent_line_item_id uuid REFERENCES public.quote_line_items(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  cost_price numeric NOT NULL DEFAULT 0,
  sell_price numeric NOT NULL DEFAULT 0,
  margin_percentage numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  estimated_hours numeric NOT NULL DEFAULT 0,
  item_order integer NOT NULL DEFAULT 0,
  is_optional boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  price_book_item_id uuid REFERENCES public.price_book_items(id) ON DELETE SET NULL,
  is_from_price_book boolean NOT NULL DEFAULT false,
  source_room_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE TRIGGER update_quote_line_items_updated_at
  BEFORE UPDATE ON public.quote_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view org quote line items"
  ON public.quote_line_items FOR SELECT
  USING (
    (organization_id = get_user_org_id(auth.uid()))
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Non-viewers can create org quote line items"
  ON public.quote_line_items FOR INSERT
  WITH CHECK (
    (organization_id = get_user_org_id(auth.uid()))
    AND (NOT has_role(auth.uid(), 'viewer'::app_role))
  );

CREATE POLICY "Non-viewers can update org quote line items"
  ON public.quote_line_items FOR UPDATE
  USING (
    ((organization_id = get_user_org_id(auth.uid()))
    AND (NOT has_role(auth.uid(), 'viewer'::app_role)))
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Non-viewers can delete org quote line items"
  ON public.quote_line_items FOR DELETE
  USING (
    ((organization_id = get_user_org_id(auth.uid()))
    AND (NOT has_role(auth.uid(), 'viewer'::app_role)))
    OR is_platform_admin(auth.uid())
  );

-- =============================================
-- GENERATE QUOTE NUMBER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_quote_number(_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max_num integer;
  _next_num integer;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN quote_number ~ '^Q-[0-9]+$' 
        THEN CAST(substring(quote_number from 3) AS integer)
        ELSE 0
      END
    ), 0
  ) INTO _max_num
  FROM public.quotes
  WHERE organization_id = _org_id;

  _next_num := _max_num + 1;
  RETURN 'Q-' || lpad(_next_num::text, 4, '0');
END;
$$;

-- Indexes for performance
CREATE INDEX idx_quotes_organization_id ON public.quotes(organization_id);
CREATE INDEX idx_quotes_project_id ON public.quotes(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_created_by ON public.quotes(created_by);
CREATE INDEX idx_quote_line_items_quote_id ON public.quote_line_items(quote_id);
CREATE INDEX idx_quote_line_items_parent_id ON public.quote_line_items(parent_line_item_id) WHERE parent_line_item_id IS NOT NULL;
