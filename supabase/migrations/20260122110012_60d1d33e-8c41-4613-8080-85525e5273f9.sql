-- Phase 2: Team Member Management System

-- Create enum for member status
CREATE TYPE public.member_status AS ENUM ('pending', 'active', 'suspended');

-- Create organization_members table for team management
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  role app_role NOT NULL DEFAULT 'user',
  status member_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  activated_at TIMESTAMPTZ,
  UNIQUE(organization_id, email)
);

-- Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Policy: Org admins can manage members (CRUD)
CREATE POLICY "Org admins can manage members"
ON public.organization_members
FOR ALL
TO authenticated
USING (
  (organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  OR is_platform_admin(auth.uid())
);

-- Policy: Users can view members in their org
CREATE POLICY "Users can view org members"
ON public.organization_members
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_org_id(auth.uid())
  OR is_platform_admin(auth.uid())
);

-- Policy: Users can view their own member record
CREATE POLICY "Users can view own member record"
ON public.organization_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_organization_members_email ON public.organization_members(email);

-- Add trigger for updated_at (if needed for future use)
CREATE OR REPLACE FUNCTION public.handle_org_member_user_link()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user signs up with an email that matches a pending member, link them
  UPDATE public.organization_members
  SET user_id = NEW.id,
      status = 'active',
      activated_at = now()
  WHERE email = NEW.email
    AND status = 'pending'
    AND user_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-link users on signup
CREATE TRIGGER on_auth_user_created_link_member
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_org_member_user_link();