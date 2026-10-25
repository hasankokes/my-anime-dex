/*
  # Fix RLS Recursion
  
  ## Problem
  The policies on `lists` check `list_collaborators`, and policies on `list_collaborators` check `lists`.
  This creates an infinite recursion loop (code 42P17).

  ## Solution
  We use a `SECURITY DEFINER` function to check list ownership. 
  This function runs with owner privileges (bypassing RLS on `lists`) when called 
  from the `list_collaborators` policy, breaking the loop.

  ## Changes
  1. Create function `is_list_owner(list_id)`.
  2. Drop recursive policies on `list_collaborators`.
  3. Re-create policies using the new function.
*/

-- 1. Create Security Definer Function to check ownership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_list_owner(_list_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lists
    WHERE id = _list_id AND user_id = auth.uid()
  );
$$;

-- 2. Drop existing recursive policies
DROP POLICY IF EXISTS "List owners can view collaborators." ON public.list_collaborators;
DROP POLICY IF EXISTS "List owners can add collaborators." ON public.list_collaborators;
DROP POLICY IF EXISTS "List owners can remove collaborators." ON public.list_collaborators;

-- 3. Re-create policies using the function

-- List owners can view collaborators (uses function to avoid recursion)
CREATE POLICY "List owners can view collaborators." 
  ON public.list_collaborators FOR SELECT 
  USING ( public.is_list_owner(list_id) );

-- List owners can add collaborators
CREATE POLICY "List owners can add collaborators." 
  ON public.list_collaborators FOR INSERT 
  WITH CHECK ( public.is_list_owner(list_id) );

-- List owners can remove collaborators
CREATE POLICY "List owners can remove collaborators." 
  ON public.list_collaborators FOR DELETE 
  USING ( public.is_list_owner(list_id) );
