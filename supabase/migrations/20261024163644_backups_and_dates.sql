/*
  # Data portability and cloud backup (Module 6)

  1. user_anime_list.started_at / finished_at: kept from MAL / AniList imports (free).
  2. user_backups: premium cloud backups of a user's list and ratings (payload jsonb).
     Clients can only read their own rows; rows are written by the functions below.
     The 7 newest backups per user are kept; a daily backup is skipped when nothing changed.
  3. private.backup_user(uid, kind) snapshots one user; private.create_daily_backups() runs it
     for every premium user and is scheduled daily with pg_cron (03:17 UTC).
  4. create_backup(): manual backup RPC for the app, premium checked server-side, at most one
     per 10 minutes.

  private.backup_user and public.restore_backup (they remove rows: retention / list replace)
  are in the follow-up `backup_functions` migration.
*/

-- 1. dates
ALTER TABLE public.user_anime_list
  ADD COLUMN IF NOT EXISTS started_at date,
  ADD COLUMN IF NOT EXISTS finished_at date;

-- 2. backups
CREATE TABLE IF NOT EXISTS public.user_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL DEFAULT 'daily' CHECK (kind IN ('daily', 'manual', 'pre_restore')),
  item_count integer NOT NULL,
  checksum text NOT NULL,
  payload jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS user_backups_user_created_idx ON public.user_backups (user_id, created_at DESC);

ALTER TABLE public.user_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own backups"
  ON public.user_backups FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 3. daily job (private.backup_user is created in 20261024163645_backup_functions)
CREATE OR REPLACE FUNCTION private.create_daily_backups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_count integer := 0;
BEGIN
  FOR v_uid IN
    SELECT p.id FROM public.profiles p
    WHERE p.is_pro AND (p.pro_expires_at IS NULL OR p.pro_expires_at > now())
  LOOP
    IF private.backup_user(v_uid, 'daily') IS NOT NULL THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule('daily-user-backups', '17 3 * * *', $cron$SELECT private.create_daily_backups()$cron$);

-- 4. app RPCs
CREATE OR REPLACE FUNCTION public.create_backup()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  IF NOT private.is_premium(v_uid) THEN
    RAISE EXCEPTION 'Backups require Premium' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_backups b
    WHERE b.user_id = v_uid AND b.kind = 'manual' AND b.created_at > now() - interval '10 minutes'
  ) THEN
    RAISE EXCEPTION 'Please wait before taking another backup' USING ERRCODE = 'P0001', HINT = 'rate_limited';
  END IF;
  RETURN private.backup_user(v_uid, 'manual');
END;
$$;

