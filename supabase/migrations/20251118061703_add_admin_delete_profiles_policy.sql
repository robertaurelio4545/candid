/*
  # Add admin delete profiles policy

  1. Changes
    - Add DELETE policy for profiles table that allows admins to delete any profile
    
  2. Security
    - Only users with is_admin = true can delete profiles
    - This allows admins to manage user accounts from the admin dashboard
*/

-- Allow admins to delete any profile
CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
