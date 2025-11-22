/*
  # Allow Fake User Profiles

  1. Changes to Existing Tables
    - Remove foreign key constraint from profiles.id to auth.users
    - This allows creating profile records without corresponding auth.users entries
    - Necessary for generating test data with fake users

  2. Important Notes
    - Real users will still be created with auth.users entries
    - Fake users are for testing and demonstration purposes only
*/

-- Drop the foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
