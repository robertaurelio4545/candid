/*
  # Add Redeem Points for Pro Function

  1. New Function
    - `redeem_points_for_pro` - Allows users to redeem 200 points for 1 month of Pro membership
      - Deducts 200 points from user's balance
      - Grants or extends Pro membership by 1 month
      - Runs with SECURITY DEFINER to bypass RLS restrictions
      - Validates user has sufficient points before processing
  
  2. Security
    - Function validates the caller is authenticated
    - Validates user has at least 200 points
    - Uses transaction semantics to ensure atomicity
    - Only affects the authenticated user's own profile
*/

CREATE OR REPLACE FUNCTION public.redeem_points_for_pro()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_points integer;
  v_current_expires_at timestamptz;
  v_new_expires_at timestamptz;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get current points and subscription status
  SELECT points, subscription_expires_at
  INTO v_current_points, v_current_expires_at
  FROM profiles
  WHERE id = v_user_id;
  
  -- Validate user has enough points
  IF v_current_points < 200 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient points',
      'current_points', v_current_points
    );
  END IF;
  
  -- Calculate new expiration date
  -- If already pro and not expired, extend from current date
  -- Otherwise, start from now
  IF v_current_expires_at IS NOT NULL AND v_current_expires_at > now() THEN
    v_new_expires_at := v_current_expires_at + interval '1 month';
  ELSE
    v_new_expires_at := now() + interval '1 month';
  END IF;
  
  -- Deduct points and grant/extend pro membership
  UPDATE profiles
  SET 
    points = points - 200,
    is_pro = true,
    subscription_expires_at = v_new_expires_at
  WHERE id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_expires_at', v_new_expires_at,
    'remaining_points', v_current_points - 200
  );
END;
$$;
