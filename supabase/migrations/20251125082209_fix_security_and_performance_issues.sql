/*
  # Fix Security and Performance Issues

  1. Performance Improvements
    - Add missing index on posts.user_id foreign key for better query performance
    - Remove unused idx_profiles_last_active_at index
    
  2. RLS Policy Optimizations
    - Update all RLS policies to use (select auth.uid()) pattern instead of auth.uid()
    - This prevents re-evaluation of auth functions for each row
    - Consolidate multiple UPDATE policies on profiles table into single policies
    
  3. Function Security
    - Set secure search_path for all functions to prevent search_path attacks
    - Functions: handle_new_user, update_last_active, update_updated_at_column

  ## Changes Made

  ### Indexes
  - Added: idx_posts_user_id for posts(user_id) foreign key
  - Removed: idx_profiles_last_active_at (unused)

  ### RLS Policies (Optimized with select pattern)
  - profiles: "Users can insert own profile"
  - profiles: "Users can update own profile" (consolidated with last_active_at update)
  - posts: "Authenticated users can create posts"
  - posts: "Users can update own posts"
  - posts: "Users can delete own posts"

  ### Functions (Secured search_path)
  - handle_new_user
  - update_last_active
  - update_updated_at_column
*/

-- 1. Add missing index on posts.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

-- 2. Remove unused index
DROP INDEX IF EXISTS idx_profiles_last_active_at;

-- 3. Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own last_active_at" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

-- 4. Recreate policies with optimized (select auth.uid()) pattern

-- Profiles policies
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Posts policies
CREATE POLICY "Authenticated users can create posts"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own posts"
  ON posts
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- 5. Fix function search_path security issues

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    'https://images.pexels.com/photos/1704488/pexels-photo-1704488.jpeg?auto=compress&cs=tinysrgb&w=200'
  );
  RETURN new;
END;
$$;

-- Fix update_last_active function
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_active_at = now()
  WHERE id = auth.uid();
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;