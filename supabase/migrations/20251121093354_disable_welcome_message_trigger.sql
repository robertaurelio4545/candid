/*
  # Disable Welcome Message Trigger

  1. Changes
    - Drops the trigger that sends automatic welcome messages
    - Keeps the function for potential future use

  2. Details
    - Removes `on_profile_created` trigger from profiles table
    - New users will no longer receive automatic welcome messages
*/

-- Drop the trigger
DROP TRIGGER IF EXISTS on_profile_created ON profiles;