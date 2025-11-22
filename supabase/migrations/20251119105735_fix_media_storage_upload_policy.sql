/*
  # Fix Media Storage Upload Policy

  1. Changes
    - Drop and recreate the INSERT policy for media uploads
    - Add proper WITH CHECK constraint to allow uploads to the media bucket
    - Ensure authenticated users can upload to their own folder
  
  2. Security
    - Only authenticated users can upload
    - Users can only upload to their own user folder (user_id/filename pattern)
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;

-- Create new INSERT policy with proper constraints
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
