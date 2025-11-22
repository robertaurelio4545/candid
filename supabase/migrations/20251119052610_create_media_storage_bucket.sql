-- Create Media Storage Bucket
-- 
-- 1. New Storage
--    - Creates media storage bucket for user uploads
--    - Allows public read access to media files
--    - Restricts uploads to authenticated users only
--    - Maximum file size: 50MB per file
--    - Allowed file types: images, videos, and documents
-- 
-- 2. Security
--    - Public can view/download files (for public posts)
--    - Only authenticated users can upload files
--    - Users can only delete their own files
--    - RLS policies ensure proper access control
-- 
-- 3. Details
--    - Bucket name: media
--    - Public access: true (for viewing)
--    - File size limit: 52428800 bytes (50MB)
--    - Allowed MIME types: image/*, video/*, application/pdf

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800,
  ARRAY['image/*', 'video/*', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view media files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;

-- Policy: Anyone can view/download files (public read)
CREATE POLICY "Public can view media files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- Policy: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Policy: Users can update their own files
CREATE POLICY "Users can update own media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);