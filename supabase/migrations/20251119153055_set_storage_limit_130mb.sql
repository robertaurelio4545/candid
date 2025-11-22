/*
  # Set Storage Limit to 130MB

  1. Changes
    - Update the media bucket file size limit to 130MB (136314880 bytes)
    - Files larger than 130MB will be rejected during upload
  
  2. Security
    - All existing RLS policies remain in place
    - Only authenticated users can upload
    - Public can view uploaded files
*/

-- Update bucket with 130MB file size limit
UPDATE storage.buckets
SET file_size_limit = 136314880
WHERE id = 'media';
