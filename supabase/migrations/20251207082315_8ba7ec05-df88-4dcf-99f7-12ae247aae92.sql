-- =============================================
-- FLOORO DATABASE SCHEMA - PHASE 1
-- =============================================

-- 1. Create role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'viewer', 'platform_admin');

-- 2. Create subscription tier enum
CREATE TYPE public.subscription_tier AS ENUM ('free', 'pro', 'enterprise');

-- 3. Create project status enum
CREATE TYPE public.project_status AS ENUM ('draft', 'pending_service', 'in_progress', 'completed');

-- =============================================
-- ORGANIZATIONS TABLE
-- =============================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  logo_url TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES TABLE (extends auth.users)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USER ROLES TABLE (separate for security)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROJECTS TABLE
-- =============================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  status project_status NOT NULL DEFAULT 'draft',
  service_requested BOOLEAN NOT NULL DEFAULT false,
  json_data JSONB DEFAULT '{}'::jsonb,
  floor_plan_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- =============================================
-- MATERIALS TABLE
-- =============================================
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('roll', 'tile', 'linear')),
  specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'platform_admin'
  )
$$;

-- Function to get user's organization id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- =============================================
-- RLS POLICIES - ORGANIZATIONS
-- =============================================

-- Users can view their own organization
CREATE POLICY "Users can view own organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  id = public.get_user_org_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- Admins can update their organization
CREATE POLICY "Admins can update own organization"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  (id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  OR public.is_platform_admin(auth.uid())
);

-- Allow creating organizations (for signup flow)
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- =============================================
-- RLS POLICIES - PROFILES
-- =============================================

-- Users can view profiles in their organization
CREATE POLICY "Users can view profiles in their organization"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_org_id(auth.uid())
  OR id = auth.uid()
  OR public.is_platform_admin(auth.uid())
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- Allow inserting profile on signup
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- =============================================
-- RLS POLICIES - USER ROLES
-- =============================================

-- Users can view roles in their organization
CREATE POLICY "Users can view roles in their organization"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT p.id FROM public.profiles p 
    WHERE p.organization_id = public.get_user_org_id(auth.uid())
  )
  OR user_id = auth.uid()
  OR public.is_platform_admin(auth.uid())
);

-- Org admins can manage roles
CREATE POLICY "Org admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.is_platform_admin(auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Org admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin') AND user_id != auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- =============================================
-- RLS POLICIES - PROJECTS
-- =============================================

-- Users can view projects in their organization
CREATE POLICY "Users can view org projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_org_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- Users can create projects in their organization
CREATE POLICY "Users can create org projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_org_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- Non-viewers can update projects
CREATE POLICY "Non-viewers can update org projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  (organization_id = public.get_user_org_id(auth.uid()) AND NOT public.has_role(auth.uid(), 'viewer'))
  OR public.is_platform_admin(auth.uid())
);

-- Admins can delete projects
CREATE POLICY "Admins can delete org projects"
ON public.projects
FOR DELETE
TO authenticated
USING (
  (organization_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  OR public.is_platform_admin(auth.uid())
);

-- =============================================
-- RLS POLICIES - MATERIALS
-- =============================================

-- Everyone can view global materials, users can view org materials
CREATE POLICY "Users can view materials"
ON public.materials
FOR SELECT
TO authenticated
USING (
  is_global = true
  OR organization_id = public.get_user_org_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- Users can create org materials
CREATE POLICY "Users can create org materials"
ON public.materials
FOR INSERT
TO authenticated
WITH CHECK (
  (organization_id = public.get_user_org_id(auth.uid()) AND is_global = false)
  OR public.is_platform_admin(auth.uid())
);

-- Users can update org materials
CREATE POLICY "Users can update org materials"
ON public.materials
FOR UPDATE
TO authenticated
USING (
  (organization_id = public.get_user_org_id(auth.uid()) AND is_global = false)
  OR public.is_platform_admin(auth.uid())
);

-- Users can delete org materials
CREATE POLICY "Users can delete org materials"
ON public.materials
FOR DELETE
TO authenticated
USING (
  (organization_id = public.get_user_org_id(auth.uid()) AND is_global = false)
  OR public.is_platform_admin(auth.uid())
);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- TRIGGER: Auto-create profile on user signup
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();