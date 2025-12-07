-- Create a security definer function to handle organization creation atomically
CREATE OR REPLACE FUNCTION public.create_organization_for_user(_name TEXT)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org public.organizations;
  _user_id UUID := auth.uid();
BEGIN
  -- Ensure user is authenticated
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user already has an organization
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND organization_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;
  
  -- Create the organization
  INSERT INTO public.organizations (name)
  VALUES (_name)
  RETURNING * INTO _org;
  
  -- Update user's profile with organization_id
  UPDATE public.profiles
  SET organization_id = _org.id
  WHERE id = _user_id;
  
  -- Assign admin role to user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN _org;
END;
$$;