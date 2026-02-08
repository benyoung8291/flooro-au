
-- Create description templates table
CREATE TABLE public.description_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  content text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.description_templates ENABLE ROW LEVEL SECURITY;

-- RLS: org members can read their org's templates
CREATE POLICY "Users can view own org templates"
  ON public.description_templates FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

-- RLS: org members can insert templates
CREATE POLICY "Users can create templates"
  ON public.description_templates FOR INSERT
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));

-- RLS: org members can update templates
CREATE POLICY "Users can update own org templates"
  ON public.description_templates FOR UPDATE
  USING (organization_id = get_user_org_id(auth.uid()));

-- RLS: org members can delete templates
CREATE POLICY "Users can delete own org templates"
  ON public.description_templates FOR DELETE
  USING (organization_id = get_user_org_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_description_templates_updated_at
  BEFORE UPDATE ON public.description_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
