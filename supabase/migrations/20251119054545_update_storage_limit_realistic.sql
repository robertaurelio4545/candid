-- Update Storage Bucket Limit to 5GB
-- 
-- 1. Changes
--    - Updates media bucket file size limit from 500TB to 5GB
--    - File size limit: 5368709120 bytes (5GB)
--    - Maintains existing security policies
--    - Supports images, videos, and documents
-- 
-- 2. Security
--    - No security policy changes
--    - All existing RLS policies remain active
--    - Public read access maintained
--    - Authenticated upload restrictions maintained

-- Update the media bucket to allow 5GB files
UPDATE storage.buckets
SET file_size_limit = 5368709120
WHERE id = 'media';