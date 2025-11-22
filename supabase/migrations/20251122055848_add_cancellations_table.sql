/*
  # Add Cancellations Tracking Table

  1. New Tables
    - `cancellations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `username` (text)
      - `cancelled_at` (timestamptz)
      - `reason` (text, optional)
      - `subscription_duration` (text, how long they were subscribed)

  2. Security
    - Enable RLS on `cancellations` table
    - Only admins can view cancellations
    - Only system can insert cancellations (via service role key)

  3. Indexes
    - Index on user_id for quick lookups
    - Index on cancelled_at for sorting
*/

CREATE TABLE IF NOT EXISTS cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  username text NOT NULL,
  cancelled_at timestamptz DEFAULT now(),
  reason text DEFAULT '',
  subscription_duration text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view cancellations"
  ON cancellations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_cancellations_user_id ON cancellations(user_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_cancelled_at ON cancellations(cancelled_at DESC);
