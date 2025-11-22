/*
  # Add Downloads Tracking

  1. New Table
    - `downloads`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles, not null)
      - `post_id` (uuid, references posts, not null)
      - `created_at` (timestamptz, default now())

  2. Indexes
    - Index on `downloads.post_id` for efficient post download queries
    - Index on `downloads.user_id` for efficient user download queries

  3. Security
    - Enable RLS on downloads table
    - Anyone can view download counts
    - Only authenticated users can record downloads
    - Users can only create download records for themselves

  4. Important Notes
    - Each download is logged to track post popularity
    - Download records cascade delete when parent post or user is deleted
    - No unique constraint - users can download the same post multiple times
*/

-- Create downloads table
CREATE TABLE IF NOT EXISTS downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_downloads_post_id ON downloads(post_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);

-- Enable RLS
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Downloads policies
CREATE POLICY "Anyone can view downloads"
  ON downloads FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can record downloads"
  ON downloads FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);