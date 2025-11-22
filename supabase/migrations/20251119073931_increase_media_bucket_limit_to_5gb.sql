/*
  # Increase Media Bucket Upload Limit to 5GB
  
  1. Changes
     - Increases media bucket file size limit to 5GB (5368709120 bytes)
     - Supports large video file uploads on paid Supabase tiers
  
  2. Notes
     - 5GB = 5,368,709,120 bytes
     - This is the maximum for Supabase Pro/Team plans
     - Allows uploading large video files without compression
*/

UPDATE storage.buckets
SET file_size_limit = 5368709120
WHERE id = 'media';