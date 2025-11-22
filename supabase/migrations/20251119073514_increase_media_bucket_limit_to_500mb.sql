/*
  # Increase Media Bucket Upload Limit
  
  1. Changes
     - Increases media bucket file size limit to 500MB (524288000 bytes)
     - Allows larger video uploads
  
  2. Notes
     - 500MB = 524,288,000 bytes
     - This allows most video files to be uploaded
     - Larger files may still be restricted by Supabase project tier limits
*/

UPDATE storage.buckets
SET file_size_limit = 524288000
WHERE id = 'media';