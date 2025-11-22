-- Fix Media Bucket Size Limit for Video Uploads
-- 
-- 1. Changes
--    - Updates media bucket file size limit to 5GB (5368709120 bytes)
--    - Removes MIME type restrictions to allow all video formats
--    - Ensures videos can be uploaded without size errors
-- 
-- 2. Security
--    - No security policy changes
--    - All existing RLS policies remain active
--    - Public read access maintained
--    - Authenticated upload restrictions maintained

-- First, ensure the bucket exists with correct settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  5368709120,  -- 5GB in bytes
  NULL  -- Allow all MIME types
)
ON CONFLICT (id) 
DO UPDATE SET 
  file_size_limit = 5368709120,
  allowed_mime_types = NULL;