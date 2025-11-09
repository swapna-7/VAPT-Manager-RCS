-- SQL commands to grant Admin users full access like Super-admin
-- Run these commands in your Supabase SQL Editor

-- Step 1: Create helper function to check if user is Admin or Super-admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin(user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('Admin', 'Super-admin')
  );
END;
$$;

-- Step 2: Add policies for Admins to view and update profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin_or_super_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin_or_super_admin(auth.uid()));

-- Step 3: Add policies for Admins to view notifications
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;

CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR SELECT
  USING (public.is_admin_or_super_admin(auth.uid()));

-- Step 4: Add policies for Admins to view and update organizations
DROP POLICY IF EXISTS "Admins can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON public.organizations;

CREATE POLICY "Admins can view all organizations"
  ON public.organizations FOR SELECT
  USING (public.is_admin_or_super_admin(auth.uid()));

CREATE POLICY "Admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (public.is_admin_or_super_admin(auth.uid()));

-- Step 5: Add policies for Admins to view activity logs
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can insert activity logs" ON public.activity_logs;

CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  USING (public.is_admin_or_super_admin(auth.uid()));

CREATE POLICY "Anyone can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- Verification query (optional - run this to verify the policies are created)
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('profiles', 'organizations', 'notifications', 'activity_logs')
ORDER BY tablename, policyname;
