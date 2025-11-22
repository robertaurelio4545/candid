-- Remove File Size Limit from Media Bucket
-- 
-- 1. Changes
--    - Sets media bucket file size limit to NULL (no limit)
--    - Removes all bucket-level size restrictions
--    - Allows uploads of any size (subject to project-level limits)
-- 
-- 2. Security
--    - No security policy changes
--    - All existing RLS policies remain active
--    - Public read access maintained
--    - Authenticated upload restrictions maintained
-- 
-- 3. Notes
--    - NULL means no bucket-level limit is enforced
--    - Actual limits may still be enforced by Supabase project tier
--    - Free tier projects typically have lower limits
--    - Pro/Team plans support much larger uploads

UPDATE storage.buckets
SET file_size_limit = NULL
WHERE id = 'media';