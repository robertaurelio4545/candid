/*
  # Update Welcome Message to Offer 1 Month Free Pro

  1. Changes
    - Updates the welcome message function to reflect new promotion
    - New message: "Welcome! Post 10 videos and receive Pro free for 1 month."

  2. Details
    - Replaces existing send_welcome_message() function
    - Simplified message focusing on video uploads
    - Updates duration from 1 week to 1 month
*/

-- Update function to send updated welcome message
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
    'Welcome! Post 10 videos and receive Pro free for 1 month.',
    'unread'
  );
  RETURN NEW;
END;
$$;