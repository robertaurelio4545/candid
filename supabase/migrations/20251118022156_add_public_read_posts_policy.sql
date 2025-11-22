/*
  # Add Public Read Policy for Posts

  1. Changes
    - Drop the existing authenticated-only SELECT policy for posts
    - Add a new public SELECT policy that allows anyone (including anonymous users) to view posts
    - Policy allows viewing unlocked posts by default
    - Pro users and admins can still view locked posts (requires authentication)
  
  2. Security
    - Anonymous users can only view unlocked posts
    - Authenticated Pro users and admins can view all posts
    - All write operations still require authentication
*/

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Anyone can view unlocked posts, pro users can view all" ON posts;

-- Create new public SELECT policy
CREATE POLICY "Public can view unlocked posts, pro users can view all"
  ON posts
  FOR SELECT
  TO public
  USING (
    NOT is_locked 
    OR (
      auth.uid() IS NOT NULL 
      AND (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.is_pro = true 
          AND (profiles.subscription_expires_at IS NULL OR profiles.subscription_expires_at > now())
        )
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.is_admin = true
        )
      )
    )
  );