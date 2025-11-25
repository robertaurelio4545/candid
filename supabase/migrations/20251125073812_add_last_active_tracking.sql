/*
  # Add Last Active Tracking

  1. Changes
    - Add `last_active_at` column to `profiles` table with default to current timestamp
    - Create function to update last active timestamp
    - Add index on `last_active_at` for efficient sorting in admin dashboard
  
  2. Security
    - Users can update their own last_active_at timestamp
    - Admins can view all last_active_at timestamps
*/

-- Add last_active_at column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_active_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_active_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create index for efficient sorting by last_active_at
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON profiles(last_active_at DESC);

-- Create function to update last_active_at
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET last_active_at = now()
  WHERE id = auth.uid();
END $$;

-- Add policy for users to update their own last_active_at
CREATE POLICY "Users can update own last_active_at"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);