-- Supabase schema (recommended)

-- This file contains the minimal SQL tables expected by the frontend code.
-- Run these in your Supabase SQL editor (or via migration) before using the app.

create table public.profiles (
  id uuid not null,
  full_name text null,
  role text not null default 'Client'::text,
  organization_id uuid null,
  allowed_emails text[] null,
  created_at timestamp with time zone null default now(),
  status text not null default 'pending'::text,
  suspended boolean not null default false,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.organizations (
  id uuid not null default gen_random_uuid (),
  name text not null,
  contact_email text null,
  contact_phone text null,
  address text null,
  services jsonb null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint organizations_pkey primary key (id)
) TABLESPACE pg_default;

create table public.notifications (
  id uuid not null default gen_random_uuid (),
  type text not null,
  actor_id uuid null,
  payload jsonb null,
  read boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint notifications_pkey primary key (id),
  constraint notifications_actor_fkey foreign KEY (actor_id) references auth.users (id) on delete set null
) TABLESPACE pg_default;

create table public.activity_logs (
  id uuid not null default gen_random_uuid (),
  actor_id uuid null,
  action text not null,
  target jsonb null,
  created_at timestamp with time zone null default now(),
  constraint activity_logs_pkey primary key (id),
  constraint activity_logs_actor_fkey foreign KEY (actor_id) references auth.users (id) on delete set null
) TABLESPACE pg_default;

create table public.security_team_organizations (
  id uuid not null default gen_random_uuid (),
  security_team_user_id uuid not null,
  organization_id uuid not null,
  assigned_at timestamp with time zone null default now(),
  assigned_by uuid null,
  constraint security_team_organizations_pkey primary key (id),
  constraint security_team_organizations_user_fkey foreign KEY (security_team_user_id) references auth.users (id) on delete CASCADE,
  constraint security_team_organizations_org_fkey foreign KEY (organization_id) references public.organizations (id) on delete CASCADE,
  constraint security_team_organizations_assigned_by_fkey foreign KEY (assigned_by) references auth.users (id) on delete set null,
  constraint security_team_organizations_unique unique (security_team_user_id, organization_id)
) TABLESPACE pg_default;

other things run in sql editor of supabase:
create extension if not exists pgcrypto;

-- Add suspended column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Add notes and updated_at columns to organizations if they don't exist
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
alter table public.notifications
add constraint notifications_actor_fkey foreign key (actor_id)
references auth.users (id) on delete set null;

alter table public.activity_logs
add constraint activity_logs_actor_fkey foreign key (actor_id)
references auth.users (id) on delete set null;


-- Drop existing function and trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_profile_on_auth_insert();

-- Then recreate them
CREATE FUNCTION public.create_profile_on_auth_insert() RETURNS trigger 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, status, created_at)
  VALUES (new.id, 'Client', 'pending', now())
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_on_auth_insert();

-- Helper function to check if user is super-admin (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'Super-admin'
  );
END;
$$;

-- Helper function to check if user is admin or super-admin (avoids RLS recursion)
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

-- Enable Row Level Security (RLS) on tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_team_organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super-admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super-admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- RLS Policies for profiles table
-- Allow users to read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow users to insert/update their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow super-admins to view all profiles (using helper function to avoid recursion)
CREATE POLICY "Super-admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Allow super-admins to update any profile (using helper function to avoid recursion)
CREATE POLICY "Super-admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

-- Allow admins to view all profiles (using helper function to avoid recursion)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin_or_super_admin(auth.uid()));

-- Allow admins to update any profile (using helper function to avoid recursion)
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin_or_super_admin(auth.uid()));

-- RLS Policies for notifications
DROP POLICY IF EXISTS "Super-admins can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;

CREATE POLICY "Super-admins can view all notifications"
  ON public.notifications FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR SELECT
  USING (public.is_admin_or_super_admin(auth.uid()));

CREATE POLICY "Anyone can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- RLS Policies for organizations
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Super-admins can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Anyone can insert organizations during signup" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Super-admins can update organizations" ON public.organizations;

CREATE POLICY "Users can view their own organization"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND organization_id = public.organizations.id
    )
  );

CREATE POLICY "Super-admins can view all organizations"
  ON public.organizations FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can view all organizations"
  ON public.organizations FOR SELECT
  USING (public.is_admin_or_super_admin(auth.uid()));

CREATE POLICY "Anyone can insert organizations during signup"
  ON public.organizations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Super-admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (public.is_admin_or_super_admin(auth.uid()));

-- Allow security team to view their assigned organizations
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

-- RLS Policies for security_team_organizations table
DROP POLICY IF EXISTS "Admins can view all assignments" ON public.security_team_organizations;
DROP POLICY IF EXISTS "Security team can view own assignments" ON public.security_team_organizations;
DROP POLICY IF EXISTS "Admins can insert assignments" ON public.security_team_organizations;
DROP POLICY IF EXISTS "Admins can delete assignments" ON public.security_team_organizations;

CREATE POLICY "Admins can view all assignments"
  ON public.security_team_organizations FOR SELECT
  USING (public.is_admin_or_super_admin(auth.uid()));

CREATE POLICY "Security team can view own assignments"
  ON public.security_team_organizations FOR SELECT
  USING (auth.uid() = security_team_user_id);

CREATE POLICY "Admins can insert assignments"
  ON public.security_team_organizations FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin(auth.uid()));

CREATE POLICY "Admins can delete assignments"
  ON public.security_team_organizations FOR DELETE
  USING (public.is_admin_or_super_admin(auth.uid()));

-- =====================================================
-- VULNERABILITIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Vulnerability Details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Informational')),
  cvss_score DECIMAL(3,1) CHECK (cvss_score >= 0 AND cvss_score <= 10),
  affected_systems TEXT NOT NULL,
  remediation TEXT NOT NULL,
  
  -- Status and Approval (Admin)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_comments TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  
  -- Client Assignment
  assigned_to_client UUID REFERENCES public.profiles(id),
  client_status TEXT CHECK (client_status IN ('open', 'reopened', 'closed')),
  client_comments TEXT,
  client_updated_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vulnerabilities table
DROP POLICY IF EXISTS "Security team can view own submissions" ON public.vulnerabilities;
DROP POLICY IF EXISTS "Security team can insert vulnerabilities for assigned orgs" ON public.vulnerabilities;
DROP POLICY IF EXISTS "Security team can update own pending submissions" ON public.vulnerabilities;
DROP POLICY IF EXISTS "Admins can view all vulnerabilities" ON public.vulnerabilities;
DROP POLICY IF EXISTS "Admins can update vulnerabilities" ON public.vulnerabilities;

CREATE POLICY "Security team can view own submissions"
  ON public.vulnerabilities FOR SELECT
  USING (
    submitted_by = auth.uid() OR
    public.is_admin_or_super_admin(auth.uid())
  );

CREATE POLICY "Security team can insert vulnerabilities for assigned orgs"
  ON public.vulnerabilities FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.security_team_organizations
      WHERE security_team_user_id = auth.uid()
      AND organization_id = public.vulnerabilities.organization_id
    )
  );

CREATE POLICY "Security team can update own pending submissions"
  ON public.vulnerabilities FOR UPDATE
  USING (
    submitted_by = auth.uid() AND
    status = 'pending'
  )
  WITH CHECK (
    submitted_by = auth.uid() AND
    status = 'pending'
  );

CREATE POLICY "Admins can view all vulnerabilities"
  ON public.vulnerabilities FOR SELECT
  USING (public.is_admin_or_super_admin(auth.uid()));

CREATE POLICY "Admins can update vulnerabilities"
  ON public.vulnerabilities FOR UPDATE
  USING (public.is_admin_or_super_admin(auth.uid()));

-- Allow clients to view vulnerabilities assigned to them
CREATE POLICY "Clients can view assigned vulnerabilities"
  ON public.vulnerabilities FOR SELECT
  USING (assigned_to_client = auth.uid());

-- Allow clients to update their assigned vulnerabilities (for status and comments)
CREATE POLICY "Clients can update assigned vulnerabilities"
  ON public.vulnerabilities FOR UPDATE
  USING (assigned_to_client = auth.uid())
  WITH CHECK (assigned_to_client = auth.uid());

-- RLS Policies for activity_logs
DROP POLICY IF EXISTS "Super-admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can insert activity logs" ON public.activity_logs;

CREATE POLICY "Super-admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  USING (public.is_admin_or_super_admin(auth.uid()));

CREATE POLICY "Anyone can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);
