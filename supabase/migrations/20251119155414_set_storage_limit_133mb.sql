/*
  # Set Storage Limit to 133MB

  1. Changes
    - Update the media bucket file size limit to 133MB (139460608 bytes)
    - Files larger than 133MB will be rejected during upload
  
  2. Security
    - All existing RLS policies remain in place
    - Only authenticated users can upload
    - Public can view uploaded files
*/

-- Update bucket with 133MB file size limit
UPDATE storage.buckets
SET file_size_limit = 139460608
WHERE id = 'media';