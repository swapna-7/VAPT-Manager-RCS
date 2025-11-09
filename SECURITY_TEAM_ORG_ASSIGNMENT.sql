-- SQL migration to add security team organization assignments

-- Step 1: Create table to track organization assignments to security team users
CREATE TABLE IF NOT EXISTS public.security_team_organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  security_team_user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  assigned_at timestamp with time zone NULL DEFAULT now(),
  assigned_by uuid NULL,
  CONSTRAINT security_team_organizations_pkey PRIMARY KEY (id),
  CONSTRAINT security_team_organizations_user_fkey FOREIGN KEY (security_team_user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT security_team_organizations_org_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations (id) ON DELETE CASCADE,
  CONSTRAINT security_team_organizations_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT security_team_organizations_unique UNIQUE (security_team_user_id, organization_id)
) TABLESPACE pg_default;

-- Step 2: Enable RLS on the new table
ALTER TABLE public.security_team_organizations ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies for security_team_organizations table

-- Allow admins and super-admins to view all assignments
DROP POLICY IF EXISTS "Admins can view all assignments" ON public.security_team_organizations;
CREATE POLICY "Admins can view all assignments"
  ON public.security_team_organizations FOR SELECT
  USING (public.is_admin_or_super_admin(auth.uid()));

-- Allow security team users to view their own assignments
DROP POLICY IF EXISTS "Security team can view own assignments" ON public.security_team_organizations;
CREATE POLICY "Security team can view own assignments"
  ON public.security_team_organizations FOR SELECT
  USING (auth.uid() = security_team_user_id);

-- Allow admins and super-admins to insert assignments
DROP POLICY IF EXISTS "Admins can insert assignments" ON public.security_team_organizations;
CREATE POLICY "Admins can insert assignments"
  ON public.security_team_organizations FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin(auth.uid()));

-- Allow admins and super-admins to delete assignments
DROP POLICY IF EXISTS "Admins can delete assignments" ON public.security_team_organizations;
CREATE POLICY "Admins can delete assignments"
  ON public.security_team_organizations FOR DELETE
  USING (public.is_admin_or_super_admin(auth.uid()));

-- Step 4: Update organizations RLS policy to allow security team to view assigned organizations
DROP POLICY IF EXISTS "Security team can view assigned organizations" ON public.organizations;
CREATE POLICY "Security team can view assigned organizations"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.security_team_organizations
      WHERE security_team_user_id = auth.uid() 
      AND organization_id = public.organizations.id
    )
  );

-- Verification query
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'security_team_organizations'
ORDER BY policyname;
