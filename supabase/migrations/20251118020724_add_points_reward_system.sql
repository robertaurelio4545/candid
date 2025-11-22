/*
  # Add Points Reward System

  1. Changes
    - Add `points` column to `profiles` table
      - Default value: 0
      - Type: integer
      - Not null constraint
    
  2. Notes
    - Users will earn 5 points for each post they create
    - Points are stored as integers and default to 0 for existing users
*/

-- Add points column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'points'
  ) THEN
    ALTER TABLE profiles ADD COLUMN points integer DEFAULT 0 NOT NULL;
  END IF;
END $$;