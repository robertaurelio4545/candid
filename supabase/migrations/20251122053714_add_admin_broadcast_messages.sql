/*
  # Add Admin Broadcast Messaging System

  1. New Tables
    - `broadcast_messages`
      - `id` (uuid, primary key)
      - `message` (text) - The broadcast message content
      - `created_by` (uuid, references profiles) - Admin who created the message
      - `created_at` (timestamptz) - When message was sent
      - `target_user_id` (uuid, nullable) - If set, message is for specific user only
      
  2. Security
    - Enable RLS on `broadcast_messages` table
    - Only admins can create broadcast messages
    - Users can read broadcast messages sent to all or to them specifically
    - Only admins can delete messages
    
  3. Purpose
    - Allows admins to send messages to all users or specific individuals
    - Messages appear in user's inbox alongside regular admin messages
*/

CREATE TABLE IF NOT EXISTS broadcast_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can create broadcast messages"
  ON broadcast_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can read broadcast messages"
  ON broadcast_messages
  FOR SELECT
  TO authenticated
  USING (
    target_user_id IS NULL OR target_user_id = auth.uid()
  );

CREATE POLICY "Admins can delete broadcast messages"
  ON broadcast_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_target_user ON broadcast_messages(target_user_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created_at ON broadcast_messages(created_at DESC);
