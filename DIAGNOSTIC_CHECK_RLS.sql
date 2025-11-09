-- Diagnostic SQL to check RLS setup and data
-- Run this in your Supabase SQL Editor to diagnose the issue

-- 1. Check if is_super_admin function exists and works
SELECT public.is_super_admin('YOUR_USER_ID_HERE'::uuid) as is_super_admin;

-- 2. Check your user's role in profiles table
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users
SELECT id, role, status, full_name 
FROM public.profiles 
WHERE id = 'YOUR_USER_ID_HERE'::uuid;

-- 3. Check all organizations (should show all if RLS is working)
SELECT COUNT(*) as total_organizations FROM public.organizations;

-- 4. Check all notifications (should show all if RLS is working)
SELECT COUNT(*) as total_notifications FROM public.notifications;

-- 5. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'organizations', 'notifications');

-- 6. List all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'organizations', 'notifications');

-- 7. Test the is_super_admin function directly
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID
SELECT 
  id,
  role,
  public.is_super_admin(id) as function_returns_true
FROM public.profiles 
WHERE role = 'Super-admin';

