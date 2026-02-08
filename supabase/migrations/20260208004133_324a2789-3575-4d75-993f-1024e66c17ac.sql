
-- Create access_requests table
CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own access requests"
ON public.access_requests
FOR SELECT
USING (user_id = auth.uid());

-- Org admins can view requests for their org
CREATE POLICY "Org admins can view org access requests"
ON public.access_requests
FOR SELECT
USING (
  organization_id = get_user_org_id(auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Users can create their own access requests
CREATE POLICY "Users can create own access requests"
ON public.access_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Org admins can update requests for their org (approve/deny)
CREATE POLICY "Org admins can update org access requests"
ON public.access_requests
FOR UPDATE
USING (
  organization_id = get_user_org_id(auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Add updated_at trigger
CREATE TRIGGER update_access_requests_updated_at
BEFORE UPDATE ON public.access_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function: check_domain_organizations
-- Returns orgs that have members with the same email domain as the calling user
CREATE OR REPLACE FUNCTION public.check_domain_organizations()
RETURNS TABLE (org_id uuid, org_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_email text;
  _domain text;
  _free_domains text[] := ARRAY[
    'gmail.com', 'googlemail.com',
    'hotmail.com', 'hotmail.co.uk', 'hotmail.com.au',
    'outlook.com', 'outlook.com.au',
    'yahoo.com', 'yahoo.co.uk', 'yahoo.com.au',
    'bigpond.com', 'bigpond.net.au', 'bigpond.com.au',
    'icloud.com', 'me.com', 'mac.com',
    'live.com', 'live.com.au',
    'msn.com',
    'aol.com',
    'protonmail.com', 'proton.me',
    'mail.com',
    'zoho.com',
    'yandex.com',
    'fastmail.com',
    'tutanota.com',
    'gmx.com', 'gmx.net',
    'optusnet.com.au',
    'tpg.com.au',
    'internode.on.net',
    'iiNet.net.au',
    'adam.com.au'
  ];
BEGIN
  -- Get the current user's email
  SELECT email INTO _user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF _user_email IS NULL THEN
    RETURN;
  END IF;

  -- Extract domain
  _domain := lower(split_part(_user_email, '@', 2));

  -- Skip if it's a free email provider
  IF _domain = ANY(_free_domains) THEN
    RETURN;
  END IF;

  -- Find organizations where other profiles share the same domain
  RETURN QUERY
  SELECT DISTINCT o.id, o.name
  FROM public.profiles p
  JOIN public.organizations o ON o.id = p.organization_id
  WHERE lower(split_part(p.email, '@', 2)) = _domain
    AND p.organization_id IS NOT NULL
    AND p.id != auth.uid();
END;
$$;

-- Function: approve_access_request
-- Approves a request and adds the user to the org
CREATE OR REPLACE FUNCTION public.approve_access_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req RECORD;
  _caller_org_id uuid;
BEGIN
  -- Get the request
  SELECT * INTO _req
  FROM public.access_requests
  WHERE id = _request_id;

  IF _req IS NULL THEN
    RAISE EXCEPTION 'Access request not found';
  END IF;

  IF _req.status != 'pending' THEN
    RAISE EXCEPTION 'Request has already been processed';
  END IF;

  -- Verify caller is admin of the target org
  _caller_org_id := get_user_org_id(auth.uid());
  IF _caller_org_id IS NULL OR _caller_org_id != _req.organization_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Update request status
  UPDATE public.access_requests
  SET status = 'approved',
      reviewed_by = auth.uid(),
      updated_at = now()
  WHERE id = _request_id;

  -- Set the user's organization
  UPDATE public.profiles
  SET organization_id = _req.organization_id
  WHERE id = _req.user_id;

  -- Create organization_members record
  INSERT INTO public.organization_members (organization_id, user_id, email, full_name, role, status, activated_at)
  VALUES (_req.organization_id, _req.user_id, _req.email, _req.full_name, 'user', 'active', now())
  ON CONFLICT DO NOTHING;

  -- Assign 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_req.user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Function: deny_access_request
CREATE OR REPLACE FUNCTION public.deny_access_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req RECORD;
  _caller_org_id uuid;
BEGIN
  SELECT * INTO _req
  FROM public.access_requests
  WHERE id = _request_id;

  IF _req IS NULL THEN
    RAISE EXCEPTION 'Access request not found';
  END IF;

  IF _req.status != 'pending' THEN
    RAISE EXCEPTION 'Request has already been processed';
  END IF;

  _caller_org_id := get_user_org_id(auth.uid());
  IF _caller_org_id IS NULL OR _caller_org_id != _req.organization_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.access_requests
  SET status = 'denied',
      reviewed_by = auth.uid(),
      updated_at = now()
  WHERE id = _request_id;
END;
$$;
