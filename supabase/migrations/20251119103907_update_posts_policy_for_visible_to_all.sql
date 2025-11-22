/*
  # Update Posts RLS Policy for visible_to_all

  1. Changes
    - Update the SELECT policy on posts to include visible_to_all logic
    - Allow all users to view locked posts if visible_to_all is true
    - Maintain existing logic for Pro users and admins
  
  2. Security
    - Anonymous users can view unlocked posts
    - Anonymous users can view locked posts if visible_to_all is true
    - Pro users and admins can view all posts
    - Post owners can view their own locked posts
*/

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Public can view unlocked posts, pro users can view all" ON posts;

-- Create updated SELECT policy with visible_to_all support
CREATE POLICY "Public can view unlocked or visible_to_all posts"
  ON posts
  FOR SELECT
  TO public
  USING (
    -- Allow if post is not locked
    NOT is_locked 
    -- Allow if post is locked but visible_to_all is true
    OR visible_to_all = true
    -- Allow if user is authenticated and meets one of these conditions
    OR (
      auth.uid() IS NOT NULL 
      AND (
        -- User is the post owner
        user_id = auth.uid()
        -- User is Pro with active subscription
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.is_pro = true 
          AND (profiles.subscription_expires_at IS NULL OR profiles.subscription_expires_at > now())
        )
        -- User is an admin
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.is_admin = true
        )
      )
    )
  );
