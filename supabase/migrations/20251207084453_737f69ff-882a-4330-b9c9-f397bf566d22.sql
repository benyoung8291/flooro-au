-- Nuclear fix: Drop ALL organization policies and recreate fresh
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view own organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update own organization" ON public.organizations;

-- Recreate INSERT policy - simple and permissive for authenticated users
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Recreate SELECT policy
CREATE POLICY "Users can view own organization"
ON public.organizations
FOR SELECT
TO authenticated
USING ((id = get_user_org_id(auth.uid())) OR is_platform_admin(auth.uid()));

-- Recreate UPDATE policy
CREATE POLICY "Admins can update own organization"
ON public.organizations
FOR UPDATE
TO authenticated
USING (((id = get_user_org_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role)) OR is_platform_admin(auth.uid()));

-- Also ensure user_roles INSERT policy allows users to assign themselves roles during onboarding
DROP POLICY IF EXISTS "Org admins can insert roles" ON public.user_roles;

CREATE POLICY "Users can insert own roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR is_platform_admin(auth.uid()));