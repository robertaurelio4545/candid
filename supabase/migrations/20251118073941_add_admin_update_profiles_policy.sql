/*
  # Add admin update policy for profiles

  1. Changes
    - Add policy allowing admins to update any profile
    - This enables admins to grant/revoke Pro status, adjust points, and manage admin roles
  
  2. Security
    - Policy checks that the user making the update is an admin (is_admin = true)
    - Only applies to authenticated users
*/

CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
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
