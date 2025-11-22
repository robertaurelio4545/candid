/*
  # Add Welcome Message Trigger for New Users

  1. Changes
    - Creates a function to send automatic welcome message to new users
    - Creates a trigger that runs after new profile creation
    - Welcome message includes instructions about earning free Pro membership

  2. Details
    - Function `send_welcome_message()` inserts an admin message to new users
    - Trigger `on_profile_created` fires after INSERT on profiles table
    - Message content: "Welcome! Post 10 posts with MEGA video links included and get free Pro membership for 1 week."

  3. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only triggers on new profile creation
*/

-- Create function to send welcome message
CREATE OR REPLACE FUNCTION send_welcome_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO admin_messages (user_id, message, status)
  VALUES (
    NEW.id,
    'Welcome! Post 10 posts with MEGA video links included and get free Pro membership for 1 week.',
    'unread'
  );
  RETURN NEW;
END;
$$;

-- Create trigger on profile creation
DROP TRIGGER IF EXISTS on_profile_created ON profiles;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_message();