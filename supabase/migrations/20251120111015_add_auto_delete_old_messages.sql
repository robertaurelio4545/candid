/*
  # Auto-delete old messages after 5 days

  1. Changes
    - Creates a function to delete messages older than 5 days
    - Creates a cron job to run the cleanup daily
    - Applies to both admin_messages and user_messages tables
  
  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only deletes messages, doesn't expose data
*/

-- Function to delete old messages
CREATE OR REPLACE FUNCTION delete_old_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete admin messages older than 5 days
  DELETE FROM admin_messages
  WHERE created_at < NOW() - INTERVAL '5 days';
  
  -- Delete user messages older than 5 days
  DELETE FROM user_messages
  WHERE created_at < NOW() - INTERVAL '5 days';
END;
$$;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run daily at 2 AM
SELECT cron.schedule(
  'delete-old-messages',
  '0 2 * * *',
  'SELECT delete_old_messages();'
);