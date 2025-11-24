/*
  # Admin Post as User Policy

  1. Changes
    - Add policy allowing admins to insert posts for any user
    - This enables admins to re-upload content under user accounts
  
  2. Security
    - Only users with is_admin=true can create posts for other users
    - Regular users can still only create posts for themselves
*/

CREATE POLICY "Admins can create posts for any user"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );
