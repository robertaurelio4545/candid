/*
  # Add Increment User Points Function

  1. New Functions
    - `increment_user_points` - Function to safely increment a user's points
      - Parameters:
        - user_id (uuid) - The ID of the user
        - points_to_add (integer) - Number of points to add
      - Returns: void
      - Security: Uses security definer to bypass RLS for point updates
  
  2. Notes
    - Function uses atomic operation to prevent race conditions
    - Security definer allows the function to update points despite RLS policies
*/

-- Create function to increment user points
CREATE OR REPLACE FUNCTION increment_user_points(user_id uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET points = points + points_to_add
  WHERE id = user_id;
END;
$$;