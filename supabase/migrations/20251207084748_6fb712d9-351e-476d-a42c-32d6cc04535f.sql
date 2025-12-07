-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Ensure clean INSERT policy on organizations
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also notify again after the change
NOTIFY pgrst, 'reload schema';