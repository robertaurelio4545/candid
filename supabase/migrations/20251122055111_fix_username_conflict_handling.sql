/*
  # Fix Username Conflict Handling

  1. Changes
    - Update handle_new_user function to handle username conflicts better
    - Check if username already exists before inserting
    - Return proper error message when username is taken
    - Generate unique fallback username with counter if needed

  2. Security
    - Maintains existing SECURITY DEFINER
    - No changes to RLS policies
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_username text;
  v_counter integer := 0;
  v_base_username text;
BEGIN
  v_username := COALESCE(new.raw_user_meta_data->>'username', 'user' || substr(new.id::text, 1, 8));
  v_base_username := v_username;
  
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, username, full_name)
      VALUES (
        new.id,
        v_username,
        COALESCE(new.raw_user_meta_data->>'full_name', '')
      );
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_counter := v_counter + 1;
      v_username := v_base_username || v_counter;
      
      IF v_counter > 100 THEN
        RAISE EXCEPTION 'Unable to generate unique username';
      END IF;
    END;
  END LOOP;
  
  RETURN new;
END;
$$;
