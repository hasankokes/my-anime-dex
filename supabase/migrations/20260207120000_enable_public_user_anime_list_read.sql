/*
  # Enable Public Read Access for User Anime List (Fix)

  ## Query Description:
  This migration fixes the RLS policy for `user_anime_list`.
  It explicitly DROPS the old restrictive policy that only allowed users to see their own lists,
  and REPLACES it with a policy allowing public read access.

  ## Metadata:
  - Schema-Category: "Security-Fix"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true
*/

-- 1. Drop the old restrictive policy (if it exists)
DROP POLICY IF EXISTS "Users can view their own list." ON public.user_anime_list;

-- 2. Drop the new policy if it was already created (to ensure clean state)
DROP POLICY IF EXISTS "Anime lists are viewable by everyone" ON public.user_anime_list;

-- 3. Create the definitive public read policy
CREATE POLICY "Public read access for anime lists" 
  ON public.user_anime_list FOR SELECT USING (true);
