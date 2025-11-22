/*
  # Fix All Security and Performance Issues

  1. Performance Improvements - Add Missing Indexes
    - Add indexes on all foreign key columns for better query performance
      - `comments.user_id`
      - `downloads.post_id` and `downloads.user_id`
      - `sponsor_requests.reviewed_by`
      - `sponsors.request_id`
    - Note: `posts.user_id` and `admin_actions.admin_id` already have indexes

  2. RLS Policy Optimization
    - Update all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  3. Remove Duplicate Policies
    - Clean up multiple permissive policies on the same table/action
    - Keep the most specific and secure policy for each case

  4. Function Security
    - Fix mutable search_path on delete_old_messages function

  5. Drop Unused Indexes
    - Remove indexes that are not being used to reduce maintenance overhead
*/

-- ============================================================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_post_id ON downloads(post_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_requests_reviewed_by ON sponsor_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_sponsors_request_id ON sponsors(request_id);

-- ============================================================================
-- 2. DROP UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_profiles_stripe_subscription_id;
DROP INDEX IF EXISTS idx_point_purchases_created_at;
DROP INDEX IF EXISTS idx_point_purchases_user_id;
DROP INDEX IF EXISTS idx_user_messages_read;
DROP INDEX IF EXISTS idx_sponsor_requests_user_id;

-- ============================================================================
-- 3. FIX RLS POLICIES - PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK (
    (select auth.uid()) = id
    AND (
      (is_pro IS NOT DISTINCT FROM (SELECT is_pro FROM profiles WHERE id = (select auth.uid())))
      AND (subscription_expires_at IS NOT DISTINCT FROM (SELECT subscription_expires_at FROM profiles WHERE id = (select auth.uid())))
    )
  );

CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 4. FIX RLS POLICIES - COMMENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
DROP POLICY IF EXISTS "Users and admins can delete comments" ON comments;
DROP POLICY IF EXISTS "Admins can delete any comment" ON comments;

CREATE POLICY "Authenticated users can create comments"
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can delete any comment"
  ON comments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 5. FIX RLS POLICIES - DOWNLOADS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can track downloads" ON downloads;
DROP POLICY IF EXISTS "Authenticated users can record downloads" ON downloads;

CREATE POLICY "Authenticated users can record downloads"
  ON downloads
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- 6. FIX RLS POLICIES - LIKES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can create likes" ON likes;
DROP POLICY IF EXISTS "Authenticated users can create likes" ON likes;

CREATE POLICY "Authenticated users can create likes"
  ON likes
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- 7. FIX RLS POLICIES - POINT_PURCHASES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own purchase history" ON point_purchases;
DROP POLICY IF EXISTS "Admins can view all purchases" ON point_purchases;

CREATE POLICY "Users can view own purchase history"
  ON point_purchases
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can view all purchases"
  ON point_purchases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 8. FIX RLS POLICIES - ADMIN_MESSAGES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can create own messages" ON admin_messages;
DROP POLICY IF EXISTS "Users can read own messages" ON admin_messages;
DROP POLICY IF EXISTS "Admins can read all messages" ON admin_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON admin_messages;

CREATE POLICY "Users can create own messages"
  ON admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can read own messages"
  ON admin_messages
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can read all messages"
  ON admin_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update messages"
  ON admin_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 9. FIX RLS POLICIES - USER_MESSAGES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can send messages" ON user_messages;
DROP POLICY IF EXISTS "Users can read received messages" ON user_messages;
DROP POLICY IF EXISTS "Users can read sent messages" ON user_messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON user_messages;
DROP POLICY IF EXISTS "Admins can read all messages" ON user_messages;

CREATE POLICY "Users can send messages"
  ON user_messages
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = sender_id);

CREATE POLICY "Users can read received messages"
  ON user_messages
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = recipient_id);

CREATE POLICY "Users can read sent messages"
  ON user_messages
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = sender_id);

CREATE POLICY "Users can update their received messages"
  ON user_messages
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = recipient_id)
  WITH CHECK ((select auth.uid()) = recipient_id);

CREATE POLICY "Admins can read all messages"
  ON user_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 10. FIX RLS POLICIES - SPONSOR_REQUESTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can create sponsor requests" ON sponsor_requests;
DROP POLICY IF EXISTS "Users can view own sponsor requests" ON sponsor_requests;
DROP POLICY IF EXISTS "Admins can view all sponsor requests" ON sponsor_requests;
DROP POLICY IF EXISTS "Admins can update sponsor requests" ON sponsor_requests;

CREATE POLICY "Users can create sponsor requests"
  ON sponsor_requests
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own sponsor requests"
  ON sponsor_requests
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can view all sponsor requests"
  ON sponsor_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update sponsor requests"
  ON sponsor_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 11. FIX RLS POLICIES - SPONSORS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage sponsors" ON sponsors;

CREATE POLICY "Admins can manage sponsors"
  ON sponsors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 12. FIX FUNCTION SECURITY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_old_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM admin_messages
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  DELETE FROM user_messages
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;
