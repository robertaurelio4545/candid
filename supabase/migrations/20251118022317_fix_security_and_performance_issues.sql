/*
  # Fix Security and Performance Issues

  1. Changes
    - Optimize RLS policies to use (select auth.uid()) instead of auth.uid()
    - Remove unused indexes to reduce database overhead
    - Consolidate multiple UPDATE policies on posts table
    - Fix function search paths for security
  
  2. RLS Policy Optimizations
    - Update all policies to use subquery pattern for better performance at scale
    - Prevents re-evaluation of auth functions for each row
  
  3. Index Cleanup
    - Remove indexes that are not being used
    - Reduces maintenance overhead and storage costs
  
  4. Function Security
    - Set stable search paths for functions to prevent security issues
*/

-- =====================================================
-- 1. FIX RLS POLICIES FOR PERFORMANCE
-- =====================================================

-- Drop existing policies on posts
DROP POLICY IF EXISTS "Public can view unlocked posts, pro users can view all" ON posts;
DROP POLICY IF EXISTS "Admins can lock posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users and admins can delete posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;

-- Create optimized SELECT policy
CREATE POLICY "Public can view unlocked posts, pro users can view all"
  ON posts
  FOR SELECT
  TO public
  USING (
    NOT is_locked 
    OR (
      (SELECT auth.uid()) IS NOT NULL 
      AND (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = (SELECT auth.uid()) 
          AND profiles.is_pro = true 
          AND (profiles.subscription_expires_at IS NULL OR profiles.subscription_expires_at > now())
        )
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = (SELECT auth.uid()) 
          AND profiles.is_admin = true
        )
      )
    )
  );

-- Create optimized INSERT policy
CREATE POLICY "Authenticated users can create posts"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create consolidated UPDATE policy (combines user update + admin lock)
CREATE POLICY "Users can update own posts, admins can lock any"
  ON posts
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  );

-- Create optimized DELETE policy
CREATE POLICY "Users and admins can delete posts"
  ON posts
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  );

-- =====================================================
-- Fix other table policies
-- =====================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- Likes policies
DROP POLICY IF EXISTS "Users can create likes" ON likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON likes;

CREATE POLICY "Users can create likes"
  ON likes
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own likes"
  ON likes
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Comments policies
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users and admins can delete comments" ON comments;

CREATE POLICY "Users can create comments"
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own comments"
  ON comments
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users and admins can delete comments"
  ON comments
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  );

-- Post media policies
DROP POLICY IF EXISTS "Post owners can insert media" ON post_media;
DROP POLICY IF EXISTS "Post owners can delete media" ON post_media;

CREATE POLICY "Post owners can insert media"
  ON post_media
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_id 
      AND posts.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Post owners can delete media"
  ON post_media
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_id 
      AND posts.user_id = (SELECT auth.uid())
    )
  );

-- Downloads policies
DROP POLICY IF EXISTS "Users can track downloads" ON downloads;
CREATE POLICY "Users can track downloads"
  ON downloads
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- =====================================================
-- 2. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_downloads_post_id;
DROP INDEX IF EXISTS idx_downloads_user_id;
DROP INDEX IF EXISTS idx_post_media_position;
DROP INDEX IF EXISTS idx_posts_user_id;
DROP INDEX IF EXISTS idx_admin_actions_admin_id;
DROP INDEX IF EXISTS idx_likes_user_id;
DROP INDEX IF EXISTS idx_comments_user_id;

-- =====================================================
-- 3. FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Recreate increment_user_points with stable search path
CREATE OR REPLACE FUNCTION increment_user_points(user_id uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET points = COALESCE(points, 0) + points_to_add
  WHERE id = user_id;
END;
$$;

-- Recreate deduct_user_points with stable search path
CREATE OR REPLACE FUNCTION deduct_user_points(user_id uuid, points_to_deduct integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_points integer;
BEGIN
  SELECT points INTO current_points
  FROM profiles
  WHERE id = user_id;
  
  IF current_points IS NULL OR current_points < points_to_deduct THEN
    RETURN false;
  END IF;
  
  UPDATE profiles
  SET points = points - points_to_deduct
  WHERE id = user_id;
  
  RETURN true;
END;
$$;