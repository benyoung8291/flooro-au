-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also fix the profiles insert policy to be permissive
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Fix user_roles insert policy
DROP POLICY IF EXISTS "Org admins can insert roles" ON public.user_roles;

CREATE POLICY "Org admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR is_platform_admin(auth.uid())
  OR user_id = auth.uid()
);