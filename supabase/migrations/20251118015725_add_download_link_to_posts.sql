/*
  # Add download link field to posts

  1. Changes
    - Add `download_link` column to `posts` table
      - Optional text field to store custom download URLs
      - Defaults to empty string
    
  2. Notes
    - When a download_link is provided, the download button will redirect to this URL
    - If no download_link is provided, the button will download the media file as before
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'download_link'
  ) THEN
    ALTER TABLE posts ADD COLUMN download_link text DEFAULT '';
  END IF;
END $$;