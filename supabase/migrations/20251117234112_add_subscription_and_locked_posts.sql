/*
  # Add Subscription and Locked Posts Support

  1. Changes to `profiles` table
    - Add `is_pro` (boolean, default false) - indicates if user has pro subscription
    - Add `subscription_expires_at` (timestamptz, nullable) - when subscription expires
    
  2. Changes to `posts` table
    - Add `is_locked` (boolean, default false) - indicates if post is locked for pro users only
    
  3. Security
    - Only admins can lock/unlock posts
    - Update RLS policies to check subscription status for locked posts
*/

-- Add subscription fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_pro'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_pro boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_expires_at timestamptz;
  END IF;
END $$;

-- Add locked field to posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE posts ADD COLUMN is_locked boolean DEFAULT false;
  END IF;
END $$;

-- Drop existing select policy on posts and recreate with subscription check
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;

CREATE POLICY "Anyone can view unlocked posts, pro users can view all"
  ON posts FOR SELECT
  TO authenticated
  USING (
    NOT is_locked 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (
        profiles.is_pro = true 
        AND (profiles.subscription_expires_at IS NULL OR profiles.subscription_expires_at > now())
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add policy for admins to update locked status
DROP POLICY IF EXISTS "Admins can lock posts" ON posts;

CREATE POLICY "Admins can lock posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );