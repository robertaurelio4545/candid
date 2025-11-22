/*
  # Allow All Posts to be Visible - Handle Lock Overlay in UI

  1. Changes
    - Update the SELECT policy to allow ALL users to view ALL posts
    - The UI (PostCard component) will handle showing the lock overlay
    - This ensures locked posts don't disappear from the feed
  
  2. Security
    - All users can see all posts in the feed
    - The lock overlay in the UI prevents content interaction for non-Pro users
    - Write operations still require proper authentication
*/

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Public can view unlocked or visible_to_all posts" ON posts;

-- Create new policy that allows viewing all posts
CREATE POLICY "Allow all users to view all posts"
  ON posts
  FOR SELECT
  TO public
  USING (true);
