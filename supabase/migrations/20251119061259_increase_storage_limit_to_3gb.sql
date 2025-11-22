-- Increase Storage Limit to 3GB
-- 
-- 1. Changes
--    - Updates media bucket file size limit to 3GB (3221225472 bytes)
--    - Allows larger video uploads
--    - Removes previous 50MB restriction
-- 
-- 2. Security
--    - No security policy changes
--    - All existing RLS policies remain active
--    - Public read access maintained
--    - Authenticated upload restrictions maintained
-- 
-- 3. Notes
--    - Requires appropriate Supabase plan to support 3GB uploads
--    - Users should ensure their plan supports this file size

UPDATE storage.buckets
SET file_size_limit = 3221225472  -- 3GB in bytes
WHERE id = 'media';