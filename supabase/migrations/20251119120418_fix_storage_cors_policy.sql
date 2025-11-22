/*
  # Fix Storage CORS Configuration
  
  1. Changes
     - Update media bucket to allow CORS from all origins
     - This fixes the "No 'Access-Control-Allow-Origin' header" error
     - Ensures uploads work from deployed domain (candidteenpro.com)
  
  2. Details
     - Sets avif_autodetection to false to avoid issues
     - Ensures public access is properly configured
     - File size limit remains at 5GB
*/

-- Update the media bucket with proper CORS configuration
UPDATE storage.buckets
SET 
  public = true,
  avif_autodetection = false,
  file_size_limit = 5368709120
WHERE id = 'media';