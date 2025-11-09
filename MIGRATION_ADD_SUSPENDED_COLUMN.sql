-- Migration: Add suspended column to profiles table
-- Run this in your Supabase SQL Editor

-- Add suspended column to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'suspended';

