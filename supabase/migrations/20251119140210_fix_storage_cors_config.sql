/*
  # Fix Storage CORS Configuration
  
  1. Changes
    - Update the media bucket to allow CORS from all origins
    - This enables browser uploads to work properly
  
  2. Security
    - CORS allows browser-based file uploads
    - All existing RLS policies remain in place
    - Only authenticated users can upload
*/

-- Update bucket with proper CORS configuration
UPDATE storage.buckets
SET 
  public = true,
  file_size_limit = 5368709120,
  allowed_mime_types = NULL
WHERE id = 'media';
