-- Add company branding fields to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS terms_and_conditions text;