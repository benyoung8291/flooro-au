-- Drop existing organization insert policy and recreate properly
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Create a permissive insert policy for authenticated users
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (true);

-- Also ensure profiles update policy allows updating organization_id
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());