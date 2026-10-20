/*
  # Security hardening (package 1)

  1. arena_pools: enable RLS, read-only for clients (the app only SELECTs).
     Seed/fix scripts must now use the service role key to write.
  2. profiles: clients may only update username, avatar_url, updated_at and
     is_pro. xp/level are maintained server-side by the on_list_change_update_xp
     trigger (SECURITY DEFINER). is_pro stays writable until RevenueCat sync
     moves to a webhook.
  3. arena_results: a row can only be created/updated for yourself (or anonymous).
  4. Functions: pin search_path on delete_user_account and stop exposing
     trigger/internal SECURITY DEFINER functions over RPC.
*/

-- 1. arena_pools
ALTER TABLE public.arena_pools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read arena pools" ON public.arena_pools;
CREATE POLICY "Anyone can read arena pools"
  ON public.arena_pools FOR SELECT
  USING (true);

-- 2. profiles: column-level UPDATE grants
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (username, avatar_url, updated_at, is_pro) ON public.profiles TO authenticated;

-- 3. arena_results
DROP POLICY IF EXISTS "Anyone can insert arena results" ON public.arena_results;
CREATE POLICY "Anyone can insert arena results"
  ON public.arena_results FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own arena results" ON public.arena_results;
CREATE POLICY "Users can update own arena results"
  ON public.arena_results FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. functions
ALTER FUNCTION public.delete_user_account() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.delete_user_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_user_xp(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_xp_change() FROM PUBLIC, anon, authenticated;
