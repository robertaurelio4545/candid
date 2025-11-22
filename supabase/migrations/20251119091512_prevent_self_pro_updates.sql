/*
  # Prevent Users from Self-Granting Pro Status

  1. Changes
    - Drop the existing "Users can update own profile" policy
    - Create new policy that prevents users from updating is_pro and subscription fields
    - Only admins can modify pro status and subscription fields
  
  2. Security
    - Users can still update their username, bio, avatar, and other personal fields
    - Users cannot grant themselves pro status or modify subscription dates
    - Admins retain full update permissions via separate policy
*/

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      (is_pro IS NOT DISTINCT FROM (SELECT is_pro FROM profiles WHERE id = auth.uid()))
      AND (subscription_expires_at IS NOT DISTINCT FROM (SELECT subscription_expires_at FROM profiles WHERE id = auth.uid()))
    )
  );
