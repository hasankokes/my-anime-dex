/*
  # Premium foundation (Module 0)

  1. app_config: server-controlled feature flags and tunables (key -> jsonb).
     Readable by everyone (guests included), writable only from the dashboard / service role.
     Every premium module starts switched off.
  2. profiles.is_pro becomes server-owned: clients lose UPDATE on it. It is written only by the
     `premium-sync` edge function (RevenueCat webhook + on-demand sync with the RevenueCat REST API).
     profiles.pro_expires_at stores the entitlement's expiry (NULL = no expiry / lifetime).
  3. private.is_premium(uid): the server-side premium check used by RLS policies and triggers of
     the premium modules (tags/notes, poll votes, backups ...).
*/

-- 1. app_config
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app config" ON public.app_config;
CREATE POLICY "Anyone can read app config"
  ON public.app_config FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.app_config FROM anon, authenticated;

INSERT INTO public.app_config (key, value, description) VALUES
  ('premium_stats',         'false', 'Module 1: My Stats screen + profile stats card'),
  ('premium_cosmetics',     'false', 'Module 2: themes, frames, banner, badge, Top 10'),
  ('premium_smart_recs',    'false', 'Module 3: premium layer on Discover'),
  ('premium_notifications', 'false', 'Module 4: extended episode alerts, weekly view, phone calendar'),
  ('premium_list_tools',    'false', 'Module 5: tags, notes, combined filters'),
  ('premium_backup',        'false', 'Module 6: CSV/JSON export, daily cloud backup'),
  ('import',                'false', 'Module 6: free MAL / AniList import'),
  ('content_cards',         'false', 'Module 7: server-driven polls / announcements'),
  ('smart_recs_min_rated',  '5',     'Rated anime needed before the premium For You layer')
ON CONFLICT (key) DO NOTHING;

-- 2. profiles: server-owned premium state
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;

REVOKE UPDATE (is_pro) ON public.profiles FROM authenticated;

-- 3. private.is_premium
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_premium(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((
    SELECT p.is_pro AND (p.pro_expires_at IS NULL OR p.pro_expires_at > now())
    FROM public.profiles p
    WHERE p.id = _uid
  ), false);
$$;

REVOKE EXECUTE ON FUNCTION private.is_premium(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_premium(uuid) TO authenticated;
