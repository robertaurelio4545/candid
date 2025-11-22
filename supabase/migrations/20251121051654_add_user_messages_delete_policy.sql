/*
  # Add DELETE policy for user_messages

  1. Changes
    - Add policy allowing users to delete messages they sent
    - Add policy allowing users to delete messages they received
    - This gives users control over their message history

  2. Security
    - Users can only delete messages where they are either sender or recipient
    - Ensures users have control over their own message data
*/

-- Allow users to delete messages they sent
CREATE POLICY "Users can delete sent messages"
  ON user_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Allow users to delete messages they received
CREATE POLICY "Users can delete received messages"
  ON user_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = recipient_id);