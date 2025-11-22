/*
  # Add DELETE policy for admin_messages

  1. Changes
    - Add policy allowing users to delete their own admin messages
    - This gives users control over their message history with admins

  2. Security
    - Users can only delete messages they created
    - Ensures users have control over their own data
*/

-- Allow users to delete their own admin messages
CREATE POLICY "Users can delete own admin messages"
  ON admin_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);