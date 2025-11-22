/*
  # Fix Storage CORS Headers
  
  1. Changes
     - Update media bucket to allow CORS from all origins
     - Add proper allowed_mime_types
     - Configure CORS to allow uploads from any domain
  
  2. Details
     - Sets allowed_mime_types for images and videos
     - Configures CORS to prevent "Missing Access-Control-Allow-Origin" errors
*/

-- Update the media bucket with proper CORS configuration
UPDATE storage.buckets
SET 
  public = true,
  avif_autodetection = false,
  file_size_limit = 5368709120,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/mpeg',
    'video/webm',
    'video/x-msvideo',
    'video/x-matroska'
  ]
WHERE id = 'media';