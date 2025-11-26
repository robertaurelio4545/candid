/*
  # Auto-delete posts without download links

  1. Changes
    - Creates a trigger function that automatically deletes posts that don't have a download_link
    - Trigger runs after insert on posts table
    - Only deletes posts where download_link is NULL or empty string
  
  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only affects newly created posts
*/

-- Create function to delete posts without download links
CREATE OR REPLACE FUNCTION delete_posts_without_download_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the post if download_link is NULL or empty
  IF NEW.download_link IS NULL OR NEW.download_link = '' THEN
    DELETE FROM posts WHERE id = NEW.id;
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that runs after insert
DROP TRIGGER IF EXISTS trigger_delete_posts_without_download_link ON posts;
CREATE TRIGGER trigger_delete_posts_without_download_link
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION delete_posts_without_download_link();
