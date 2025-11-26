/*
  # Update auto-delete to only affect image posts

  1. Changes
    - Updates the trigger function to only delete IMAGE posts without download links
    - VIDEO posts are allowed to stay even without download links
    - Checks the media_type field to determine if it's an image or video
  
  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only affects newly created posts
*/

-- Update function to only delete image posts without download links
CREATE OR REPLACE FUNCTION delete_posts_without_download_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Only delete if it's an image post AND has no download link
  IF (NEW.download_link IS NULL OR NEW.download_link = '') 
     AND NEW.media_type LIKE 'image/%' THEN
    DELETE FROM posts WHERE id = NEW.id;
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
