/*
  # Increase Storage Limit to 3GB
  
  1. Changes
    - Update the media bucket file size limit to 3GB (3221225472 bytes)
    - Allow upload of larger video files
  
  2. Security
    - All existing RLS policies remain in place
    - Only authenticated users can upload
    - Public can view uploaded files
*/

-- Update bucket with 3GB file size limit
UPDATE storage.buckets
SET file_size_limit = 3221225472
WHERE id = 'media';
