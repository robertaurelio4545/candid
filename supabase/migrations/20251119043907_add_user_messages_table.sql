/*
  # Add User-to-User Messages Table

  1. New Tables
    - `user_messages`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references profiles) - The user sending the message
      - `recipient_id` (uuid, references profiles) - The user receiving the message
      - `message` (text) - The message content
      - `read` (boolean, default false) - Whether the message has been read
      - `created_at` (timestamptz) - When the message was sent

  2. Security
    - Enable RLS on `user_messages` table
    - Add policy for users to send messages to others
    - Add policy for users to read messages sent to them
    - Add policy for users to read messages they sent
    - Add policy for admins to read all messages

  3. Indexes
    - Add index on sender_id for faster lookups
    - Add index on recipient_id for faster lookups
    - Add index on read status for filtering
    - Add index on created_at for sorting

  4. Notes
    - This allows direct user-to-user messaging
    - Admins can view all messages for moderation
    - Users can only see messages they sent or received
*/

CREATE TABLE IF NOT EXISTS user_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT different_users CHECK (sender_id != recipient_id)
);

ALTER TABLE user_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can send messages"
  ON user_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can read received messages"
  ON user_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can read sent messages"
  ON user_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages"
  ON user_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Admins can read all messages"
  ON user_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_user_messages_sender_id ON user_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_recipient_id ON user_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_read ON user_messages(read);
CREATE INDEX IF NOT EXISTS idx_user_messages_created_at ON user_messages(created_at DESC);
