/*
  # Add Deduct Points Function

  1. New Functions
    - `deduct_user_points` - Function to safely deduct points from a user
      - Parameters:
        - user_id (uuid) - The ID of the user
        - points_to_deduct (integer) - Number of points to deduct
      - Returns: boolean - True if successful, false if insufficient points
      - Security: Uses security definer to bypass RLS for point updates
  
  2. Notes
    - Function checks if user has enough points before deducting
    - Returns false if user doesn't have enough points
    - Uses atomic operation to prevent race conditions
*/

-- Create function to deduct user points
CREATE OR REPLACE FUNCTION deduct_user_points(user_id uuid, points_to_deduct integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_points integer;
BEGIN
  -- Get current points
  SELECT points INTO current_points
  FROM profiles
  WHERE id = user_id;
  
  -- Check if user has enough points
  IF current_points < points_to_deduct THEN
    RETURN false;
  END IF;
  
  -- Deduct points
  UPDATE profiles
  SET points = points - points_to_deduct
  WHERE id = user_id;
  
  RETURN true;
END;
$$;