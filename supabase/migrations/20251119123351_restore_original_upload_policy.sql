/*
  # Restore Original Upload Policy
  
  1. Changes
    - Restore the original simple upload policy that worked for large files
    - Remove folder name restriction that was added later
    - Keep only bucket_id = 'media' check
  
  2. Security
    - Only authenticated users can upload
    - Uploads restricted to media bucket only
    - This matches the policy that successfully uploaded 793MB files
*/

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;

-- Restore original simple policy (same as 20251119052610)
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media');