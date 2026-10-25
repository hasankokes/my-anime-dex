/*
  # Backup functions that delete rows (Module 6, part 2)

  Split from `backups_and_dates` because they contain DELETE statements (applied via the
  SQL editor). See that migration for the overall design.

  - private.backup_user(uid, kind): snapshot of the user's list + ratings; keeps the 7 newest
    backups; a 'daily' run is skipped when nothing changed since the last backup.
  - public.restore_backup(backup_id): premium only; takes a 'pre_restore' backup, replaces the
    user's list with the backup and upserts its ratings. Returns the number of entries restored.
  - Both backup RPCs are executable by signed-in users only.
*/

CREATE OR REPLACE FUNCTION private.backup_user(_uid uuid, _kind text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payload jsonb;
  v_checksum text;
  v_last text;
  v_id uuid;
BEGIN
  SELECT jsonb_build_object(
    'version', 1,
    'list', COALESCE((
      SELECT jsonb_agg(to_jsonb(l) - 'id' - 'user_id' ORDER BY l.anime_id)
      FROM public.user_anime_list l
      WHERE l.user_id = _uid
    ), '[]'::jsonb),
    'reviews', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'anime_id', r.anime_id, 'rating', r.rating, 'comment', r.comment,
        'created_at', r.created_at, 'updated_at', r.updated_at
      ) ORDER BY r.anime_id)
      FROM public.reviews r
      WHERE r.user_id = _uid
    ), '[]'::jsonb)
  ) INTO v_payload;

  v_checksum := md5(v_payload::text);

  -- A daily run with nothing new since the last backup adds nothing
  IF _kind = 'daily' THEN
    SELECT b.checksum INTO v_last
    FROM public.user_backups b
    WHERE b.user_id = _uid
    ORDER BY b.created_at DESC
    LIMIT 1;
    IF v_last = v_checksum THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.user_backups (user_id, kind, item_count, checksum, payload)
  VALUES (_uid, _kind, jsonb_array_length(v_payload -> 'list'), v_checksum, v_payload)
  RETURNING id INTO v_id;

  -- Keep the 7 newest
  DELETE FROM public.user_backups b
  WHERE b.user_id = _uid
    AND b.id NOT IN (
      SELECT k.id FROM public.user_backups k
      WHERE k.user_id = _uid
      ORDER BY k.created_at DESC
      LIMIT 7
    );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_backup(p_backup_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_payload jsonb;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  IF NOT private.is_premium(v_uid) THEN
    RAISE EXCEPTION 'Restoring requires Premium' USING ERRCODE = '42501';
  END IF;

  SELECT b.payload INTO v_payload
  FROM public.user_backups b
  WHERE b.id = p_backup_id AND b.user_id = v_uid;
  IF v_payload IS NULL THEN
    RAISE EXCEPTION 'Backup not found' USING ERRCODE = 'P0002';
  END IF;

  -- Safety net: the current state can be restored again
  PERFORM private.backup_user(v_uid, 'pre_restore');

  DELETE FROM public.user_anime_list WHERE user_id = v_uid;

  INSERT INTO public.user_anime_list (
    user_id, anime_id, anime_title, anime_image, status, is_favorite, current_episode, total_episodes,
    created_at, updated_at, score, genres, studios, season_year, format, tags, notes, started_at, finished_at
  )
  SELECT
    v_uid, r.anime_id, r.anime_title, r.anime_image, r.status, r.is_favorite, r.current_episode, r.total_episodes,
    COALESCE(r.created_at, now()), COALESCE(r.updated_at, now()), r.score, r.genres, r.studios, r.season_year,
    r.format, COALESCE(r.tags, '{}'), r.notes, r.started_at, r.finished_at
  FROM jsonb_populate_recordset(NULL::public.user_anime_list, v_payload -> 'list') r
  WHERE r.anime_id IS NOT NULL
  ON CONFLICT (user_id, anime_id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.reviews (user_id, anime_id, rating, comment, created_at, updated_at)
  SELECT v_uid, r.anime_id, r.rating, r.comment, COALESCE(r.created_at, now()), COALESCE(r.updated_at, now())
  FROM jsonb_to_recordset(v_payload -> 'reviews')
    AS r(anime_id text, rating integer, comment text, created_at timestamptz, updated_at timestamptz)
  WHERE r.anime_id IS NOT NULL AND r.rating BETWEEN 1 AND 5
  ON CONFLICT (user_id, anime_id) DO UPDATE
    SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = EXCLUDED.updated_at;

  RETURN v_count;
END;
$$;

-- Backup RPCs are for signed-in users only (they also refuse calls without auth.uid())
REVOKE EXECUTE ON FUNCTION public.create_backup() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restore_backup(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_backup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_backup(uuid) TO authenticated;
