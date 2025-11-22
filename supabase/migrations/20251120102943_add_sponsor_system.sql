/*
  # Add Sponsor System

  1. New Tables
    - `sponsor_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `website_name` (text)
      - `website_link` (text)
      - `status` (text: pending, approved, rejected)
      - `created_at` (timestamptz)
      - `reviewed_at` (timestamptz, nullable)
      - `reviewed_by` (uuid, references auth.users, nullable)
    
    - `sponsors`
      - `id` (uuid, primary key)
      - `spot_number` (integer, 1-10, unique)
      - `website_name` (text)
      - `website_link` (text)
      - `request_id` (uuid, references sponsor_requests, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can create their own sponsor requests
    - Users can view approved sponsors
    - Only admins can approve/reject requests and manage sponsors
*/

CREATE TABLE IF NOT EXISTS sponsor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  website_name text NOT NULL,
  website_link text NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_number integer UNIQUE NOT NULL CHECK (spot_number >= 1 AND spot_number <= 10),
  website_name text NOT NULL,
  website_link text NOT NULL,
  request_id uuid REFERENCES sponsor_requests(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE sponsor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create sponsor requests"
  ON sponsor_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own sponsor requests"
  ON sponsor_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sponsor requests"
  ON sponsor_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update sponsor requests"
  ON sponsor_requests FOR UPDATE
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

CREATE POLICY "Anyone can view active sponsors"
  ON sponsors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage sponsors"
  ON sponsors FOR ALL
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

CREATE INDEX IF NOT EXISTS idx_sponsor_requests_user_id ON sponsor_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_requests_status ON sponsor_requests(status);
CREATE INDEX IF NOT EXISTS idx_sponsors_spot_number ON sponsors(spot_number);
