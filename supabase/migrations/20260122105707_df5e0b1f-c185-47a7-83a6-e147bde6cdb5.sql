-- Phase 1: Remove Service Bureau functionality

-- Step 1: Drop service-related columns from projects table
ALTER TABLE public.projects DROP COLUMN IF EXISTS service_requested;
ALTER TABLE public.projects DROP COLUMN IF EXISTS assigned_to;
ALTER TABLE public.projects DROP COLUMN IF EXISTS internal_notes;

-- Step 2: Create new simplified project_status enum
-- First, we need to update existing values to the new simplified set
UPDATE public.projects SET status = 'draft' WHERE status IN ('pending_service', 'in_progress');
UPDATE public.projects SET status = 'completed' WHERE status = 'completed';

-- Step 3: Create the new enum type
CREATE TYPE public.project_status_new AS ENUM ('draft', 'active', 'archived');

-- Step 4: Alter the column to use the new enum
ALTER TABLE public.projects 
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.project_status_new 
    USING CASE 
      WHEN status::text = 'completed' THEN 'archived'::public.project_status_new
      WHEN status::text = 'draft' THEN 'draft'::public.project_status_new
      ELSE 'active'::public.project_status_new
    END,
  ALTER COLUMN status SET DEFAULT 'draft'::public.project_status_new;

-- Step 5: Drop old enum and rename new one
DROP TYPE public.project_status;
ALTER TYPE public.project_status_new RENAME TO project_status;