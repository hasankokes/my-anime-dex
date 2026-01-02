/*
  # Delete User Account Function

  ## Query Description:
  This migration adds a secure RPC function to allow users to delete their own account.
  It deletes the user from `auth.users`, which triggers the ON DELETE CASCADE for all related data.
  
  ## Metadata:
  - Schema-Category: "Security"
  - Impact-Level: "High" (Data Deletion)
  - Requires-Backup: false
  - Reversible: true (Drop function)
*/

-- Create the function in the public schema
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the ID of the authenticated user
  current_user_id := auth.uid();
  
  -- Ensure a user is logged in
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete the user from the auth.users table
  -- This will cascade to all other tables due to foreign keys
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
