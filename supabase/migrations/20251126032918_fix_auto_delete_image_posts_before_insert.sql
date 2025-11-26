/*
  # Fix auto-delete to use BEFORE INSERT trigger

  1. Changes
    - Changes from AFTER INSERT to BEFORE INSERT trigger
    - Prevents image posts without download links from being created
    - Returns NULL to abort the insert operation for invalid posts
    - Video posts are still allowed without download links
  
  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only affects newly created posts
*/

-- Drop the existing AFTER trigger
DROP TRIGGER IF EXISTS trigger_delete_posts_without_download_link ON posts;

-- Update function to work as BEFORE INSERT trigger
CREATE OR REPLACE FUNCTION delete_posts_without_download_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent insert if it's an image post AND has no download link
  IF (NEW.download_link IS NULL OR NEW.download_link = '') 
     AND NEW.media_type LIKE 'image/%' THEN
    -- Return NULL to prevent the insert
    RETURN NULL;
  END IF;
  
  -- Allow the insert to proceed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create BEFORE INSERT trigger
CREATE TRIGGER trigger_delete_posts_without_download_link
  BEFORE INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION delete_posts_without_download_link();
