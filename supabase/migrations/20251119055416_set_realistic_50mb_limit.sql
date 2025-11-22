-- Set Realistic 50MB Storage Limit
-- 
-- 1. Changes
--    - Sets media bucket file size limit to 50MB (52428800 bytes)
--    - This matches Supabase free tier limitations
--    - Allows both images and videos up to 50MB
-- 
-- 2. Security
--    - No security policy changes
--    - All existing RLS policies remain active
--    - Public read access maintained
--    - Authenticated upload restrictions maintained
-- 
-- 3. Notes
--    - Supabase free tier has a 50MB file upload limit
--    - This limit cannot be exceeded without upgrading plans
--    - Users should compress videos before uploading

UPDATE storage.buckets
SET file_size_limit = 52428800  -- 50MB in bytes
WHERE id = 'media';