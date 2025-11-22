/*
  # Add Admin Messages Table

  1. New Tables
    - `admin_messages`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `message` (text)
      - `status` (text, default 'unread') - can be 'unread', 'read', 'replied'
      - `admin_reply` (text, nullable)
      - `created_at` (timestamptz)
      - `replied_at` (timestamptz, nullable)

  2. Security
    - Enable RLS on `admin_messages` table
    - Add policy for users to create their own messages
    - Add policy for users to read their own messages
    - Add policy for admins to read all messages
    - Add policy for admins to update messages (for replies)

  3. Indexes
    - Add index on user_id for faster lookups
    - Add index on status for admin filtering
*/

CREATE TABLE IF NOT EXISTS admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'unread' NOT NULL,
  admin_reply text,
  created_at timestamptz DEFAULT now() NOT NULL,
  replied_at timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('unread', 'read', 'replied'))
);

ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own messages"
  ON admin_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own messages"
  ON admin_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all messages"
  ON admin_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update messages"
  ON admin_messages FOR UPDATE
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

CREATE INDEX IF NOT EXISTS idx_admin_messages_user_id ON admin_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_status ON admin_messages(status);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created_at ON admin_messages(created_at DESC);