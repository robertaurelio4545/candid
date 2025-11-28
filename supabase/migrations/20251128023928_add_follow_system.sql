/*
  # Add Follow System

  1. New Tables
    - `follows`
      - `id` (uuid, primary key)
      - `follower_id` (uuid, references profiles.id) - The user who is following
      - `following_id` (uuid, references profiles.id) - The user being followed
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on `follows` table
    - Add policy for users to follow others (insert)
    - Add policy for users to unfollow (delete their own follows)
    - Add policy for users to view all follows (read)
    
  3. Triggers
    - Auto-follow admin trigger: When a new user signs up, automatically create a follow relationship to the admin
*/

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Policies for follows table
CREATE POLICY "Users can view all follows"
  ON follows
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows
  FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- Function to auto-follow admin on user creation
CREATE OR REPLACE FUNCTION auto_follow_admin()
RETURNS TRIGGER AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the first admin user (you can modify this to target a specific admin)
  SELECT id INTO admin_user_id
  FROM profiles
  WHERE is_admin = true
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If an admin exists and the new user is not an admin themselves
  IF admin_user_id IS NOT NULL AND NOT NEW.is_admin THEN
    INSERT INTO follows (follower_id, following_id)
    VALUES (NEW.id, admin_user_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-follow admin on profile creation
DROP TRIGGER IF EXISTS trigger_auto_follow_admin ON profiles;
CREATE TRIGGER trigger_auto_follow_admin
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_follow_admin();

-- Backfill: Make all existing non-admin users follow the first admin
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the first admin user
  SELECT id INTO admin_user_id
  FROM profiles
  WHERE is_admin = true
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If an admin exists, make all non-admin users follow them
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO follows (follower_id, following_id)
    SELECT p.id, admin_user_id
    FROM profiles p
    WHERE p.is_admin = false
      AND NOT EXISTS (
        SELECT 1 FROM follows f
        WHERE f.follower_id = p.id AND f.following_id = admin_user_id
      )
    ON CONFLICT (follower_id, following_id) DO NOTHING;
  END IF;
END $$;