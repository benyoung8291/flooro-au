-- Phase 3: Stripe Integration - Database Tables

-- Create table to store Stripe customer data
CREATE TABLE public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their org's Stripe customer
CREATE POLICY "Users can view own org stripe customer"
ON public.stripe_customers
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_org_id(auth.uid())
  OR is_platform_admin(auth.uid())
);

-- Policy: System can manage stripe customers (via service role in edge functions)
-- No direct user INSERT/UPDATE/DELETE - handled by edge functions

-- Create table to store subscription details
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid', 'paused')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their org's subscription
CREATE POLICY "Users can view own org subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_org_id(auth.uid())
  OR is_platform_admin(auth.uid())
);

-- Create index for faster lookups
CREATE INDEX idx_subscriptions_org_id ON public.subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe_sub_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_stripe_customers_org_id ON public.stripe_customers(organization_id);

-- Create trigger for updated_at on subscriptions
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();