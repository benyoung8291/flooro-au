-- Phase 5: Security Hardening

-- Fix the overly permissive INSERT policy on organizations
-- The current policy allows any authenticated user to create an organization
-- This should be restricted to only allow creating via the create_organization_for_user function

-- Drop the permissive policy
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Create a more restrictive policy that requires proper authentication
-- Since organization creation is handled by the security definer function,
-- we can be more restrictive here
CREATE POLICY "Users can create organizations via function"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (
  -- Users can only create organizations if they don't already belong to one
  get_user_org_id(auth.uid()) IS NULL
);

-- For the admin-only statistics view, we keep is_platform_admin() bypass on SELECT
-- but remove it from INSERT/UPDATE/DELETE where tenant isolation is critical

-- Remove platform admin bypass from materials INSERT (only own org materials)
DROP POLICY IF EXISTS "Users can create org materials" ON public.materials;
CREATE POLICY "Users can create org materials"
ON public.materials
FOR INSERT
TO authenticated
WITH CHECK (
  (organization_id = get_user_org_id(auth.uid())) AND (is_global = false)
);

-- Keep is_platform_admin on SELECT policies for read-only admin statistics
-- Keep is_platform_admin on UPDATE for materials (admin might need to update global materials)

-- Remove platform admin bypass from projects INSERT
DROP POLICY IF EXISTS "Users can create org projects" ON public.projects;
CREATE POLICY "Users can create org projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_user_org_id(auth.uid())
);

-- Remove platform admin bypass from user_roles INSERT
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
CREATE POLICY "Users can insert own roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
);