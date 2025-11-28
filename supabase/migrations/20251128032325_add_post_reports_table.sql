/*
  # Add Post Reports System

  1. New Tables
    - `post_reports`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to posts)
      - `reporter_id` (uuid, foreign key to profiles)
      - `reason` (text, report reason)
      - `details` (text, optional additional details)
      - `status` (text, default 'pending': pending, reviewed, dismissed, removed)
      - `reviewed_by` (uuid, nullable foreign key to profiles - admin who reviewed)
      - `reviewed_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now())
  
  2. Security
    - Enable RLS on `post_reports` table
    - Users can create reports for posts
    - Users can view their own reports
    - Admins can view all reports and update their status
  
  3. Indexes
    - Index on post_id for faster lookups
    - Index on status for admin filtering
*/

CREATE TABLE IF NOT EXISTS post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON post_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
  ON post_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON post_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update reports"
  ON post_reports FOR UPDATE
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

CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status);
CREATE INDEX IF NOT EXISTS idx_post_reports_created_at ON post_reports(created_at DESC);