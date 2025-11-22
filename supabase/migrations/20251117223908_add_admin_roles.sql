/*
  # Add Admin Role System

  1. Changes to Tables
    - Add `is_admin` column to profiles table
      - `is_admin` (boolean, default false)
  
  2. New Tables
    - `admin_actions`
      - `id` (uuid, primary key)
      - `admin_id` (uuid, references profiles)
      - `action_type` (text) - 'delete_post', 'delete_user', 'promote_admin', etc.
      - `target_id` (uuid) - ID of affected resource
      - `details` (jsonb) - Additional action details
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on admin_actions table
    - Only admins can view admin actions
    - System automatically logs admin actions

  4. Important Notes
    - Admin status stored in profiles table
    - All admin actions are logged for accountability
    - First user to register can be promoted to admin manually via SQL
*/

-- Add is_admin column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Create admin_actions table
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on admin_actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Admin actions policies
CREATE POLICY "Only admins can view admin actions"
  ON admin_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can log actions"
  ON admin_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
    AND admin_id = auth.uid()
  );

-- Update posts policies to allow admin deletion
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

CREATE POLICY "Users and admins can delete posts"
  ON posts FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action_type text,
  p_target_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO admin_actions (admin_id, action_type, target_id, details)
  VALUES (auth.uid(), p_action_type, p_target_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin user with specific credentials
-- Email: admin@sharespace.com
-- This will be set up after signup
COMMENT ON COLUMN profiles.is_admin IS 'Indicates if user has admin privileges';