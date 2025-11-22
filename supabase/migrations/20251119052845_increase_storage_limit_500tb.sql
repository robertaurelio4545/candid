-- Increase Storage Bucket Limit to 500TB
-- 
-- 1. Changes
--    - Updates media bucket file size limit from 50MB to 500TB
--    - File size limit: 549755813888000 bytes (500TB)
--    - Maintains existing security policies
--    - Supports images, videos, and documents
-- 
-- 2. Security
--    - No security policy changes
--    - All existing RLS policies remain active
--    - Public read access maintained
--    - Authenticated upload restrictions maintained

-- Update the media bucket to allow 500TB files
UPDATE storage.buckets
SET file_size_limit = 549755813888000
WHERE id = 'media';