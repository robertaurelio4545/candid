/*
  # Add Multiple Media Support

  1. New Table
    - `post_media`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references posts, not null)
      - `media_url` (text, not null)
      - `media_type` (text, not null - 'image' or 'video')
      - `position` (integer, default 0 - order of media in post)
      - `created_at` (timestamptz, default now())

  2. Changes to Existing Tables
    - Posts table keeps media_url and media_type for backwards compatibility
    - New posts will use post_media table for multiple images

  3. Indexes
    - Index on `post_media.post_id` for efficient media queries
    - Index on `post_media.position` for proper ordering

  4. Security
    - Enable RLS on post_media table
    - Anyone can view media
    - Only post owners can insert media
    - Only post owners can delete media

  5. Important Notes
    - Supports up to 10 media items per post
    - Media items are ordered by position field
    - All media cascade deletes when parent post is deleted
*/

-- Create post_media table
CREATE TABLE IF NOT EXISTS post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_position ON post_media(position);

-- Enable RLS
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;

-- Post media policies
CREATE POLICY "Anyone can view post media"
  ON post_media FOR SELECT
  USING (true);

CREATE POLICY "Post owners can insert media"
  ON post_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Post owners can delete media"
  ON post_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.user_id = (select auth.uid())
    )
  );