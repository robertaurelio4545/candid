/*
  # Allow Users to Cancel Subscription

  1. Changes
    - Drop the restrictive update policy
    - Create new policy that allows users to cancel (set is_pro to false) but not self-grant pro status
    - Users can set is_pro from true to false (cancel)
    - Users cannot set is_pro from false to true (self-grant)
  
  2. Security
    - Users can cancel their own subscriptions
    - Users cannot grant themselves pro status
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
      is_pro = false
      OR is_pro = (SELECT is_pro FROM profiles WHERE id = auth.uid())
    )
  );
