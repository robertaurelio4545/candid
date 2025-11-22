/*
  # Add Admin Delete Comments Policy

  1. Security Changes
    - Add RLS policy allowing admins to delete any comment
    - Admins are identified by having is_admin = true in their profiles table
*/

CREATE POLICY "Admins can delete any comment"
  ON comments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
