/*
  # Update Sponsor Spots from 10 to 5

  1. Changes
    - Update the sponsors table CHECK constraint to allow only spots 1-5
    - Remove any existing sponsors in spots 6-10

  2. Security
    - No changes to RLS policies
*/

-- Remove any sponsors in spots 6-10
DELETE FROM sponsors WHERE spot_number > 5;

-- Drop the old constraint
ALTER TABLE sponsors DROP CONSTRAINT IF EXISTS sponsors_spot_number_check;

-- Add the new constraint for spots 1-5
ALTER TABLE sponsors ADD CONSTRAINT sponsors_spot_number_check CHECK (spot_number >= 1 AND spot_number <= 5);
