/*
  # Add subscription_started_at to profiles

  1. Changes
    - Add `subscription_started_at` column to track when users became Pro members
    - Backfill existing Pro members with their subscription_expires_at minus 1 year (approximation)

  2. Notes
    - This field will track when a user first became a Pro member
    - For existing Pro members, we estimate the start date as 1 year before expiration
    - New Pro subscriptions will set this field when is_pro is set to true
*/

-- Add subscription_started_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_started_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_started_at timestamptz;
  END IF;
END $$;

-- Backfill existing Pro members (estimate started date as 1 year before expiration)
UPDATE profiles
SET subscription_started_at = subscription_expires_at - INTERVAL '1 year'
WHERE is_pro = true 
  AND subscription_expires_at IS NOT NULL
  AND subscription_started_at IS NULL;