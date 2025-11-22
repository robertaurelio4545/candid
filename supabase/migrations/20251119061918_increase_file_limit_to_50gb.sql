-- Increase File Upload Limit to 50GB
-- 
-- 1. Changes
--    - Updates media bucket file size limit to 50GB (53687091200 bytes)
--    - Allows very large video uploads
--    - Removes previous 3GB restriction
-- 
-- 2. Security
--    - No security policy changes
--    - All existing RLS policies remain active
--    - Public read access maintained
--    - Authenticated upload restrictions maintained
-- 
-- 3. Notes
--    - This sets the bucket-level limit to 50GB
--    - Actual upload limits may depend on Supabase project tier
--    - Users should verify their plan supports large file uploads

UPDATE storage.buckets
SET file_size_limit = 53687091200  -- 50GB in bytes
WHERE id = 'media';