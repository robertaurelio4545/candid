/*
  # Simplify Media Upload Policy

  1. Changes
    - Drop and recreate the INSERT policy for media uploads
    - Remove folder restriction to allow any authenticated user to upload
    - Keep bucket restriction to media bucket only
  
  2. Security
    - Only authenticated users can upload
    - Uploads restricted to media bucket
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;

-- Create simplified INSERT policy
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media');
