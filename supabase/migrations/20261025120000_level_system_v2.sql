/*
  # Level system v2

  1. Level curve: going from level L to L+1 costs 5 * L XP
     (1→2: 5, 2→3: 10, … 9→10: 45). Reaching level L needs 5 * L * (L - 1) / 2 XP in total,
     so level = floor((5 + sqrt(25 + 40 * xp)) / 10).
     Mirrored on the client in lib/levelSystem.ts (keep both in sync).

  2. XP sources (always recomputed from current state, so nothing can be farmed by toggling):
     - user_anime_list: completed +5, watching +2, any other status +1, favorite +1
     - reviews: +5 with a comment of at least 20 characters, otherwise +2
     - arena_results: +2 per day with at least one finished Arena
     - lists: +3 per list with at least 3 items (max 20 lists)

  3. Triggers on reviews, arena_results, lists and list_items recompute the owner's XP,
     then every profile is backfilled.
*/

CREATE OR REPLACE FUNCTION public.calculate_level(current_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
    lvl INTEGER;
BEGIN
    IF current_xp IS NULL OR current_xp <= 0 THEN
        RETURN 1;
    END IF;
    lvl := floor((5 + sqrt(25 + 40 * current_xp::numeric)) / 10)::int;
    -- Guard against rounding at the exact thresholds
    WHILE 5 * lvl * (lvl - 1) / 2 > current_xp LOOP
        lvl := lvl - 1;
    END LOOP;
    WHILE 5 * (lvl + 1) * lvl / 2 <= current_xp LOOP
        lvl := lvl + 1;
    END LOOP;
    RETURN GREATEST(lvl, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.calculate_user_xp(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    total_xp INTEGER := 0;
BEGIN
    IF target_user_id IS NULL THEN
        RETURN;
    END IF;

    SELECT
        COALESCE((
            SELECT SUM(
                CASE status
                    WHEN 'completed' THEN 5
                    WHEN 'watching' THEN 2
                    ELSE 1
                END
                + CASE WHEN is_favorite THEN 1 ELSE 0 END
            )
            FROM public.user_anime_list
            WHERE user_id = target_user_id
        ), 0)
        + COALESCE((
            SELECT SUM(CASE WHEN length(btrim(COALESCE(comment, ''))) >= 20 THEN 5 ELSE 2 END)
            FROM public.reviews
            WHERE user_id = target_user_id
        ), 0)
        + COALESCE((
            SELECT 2 * COUNT(DISTINCT (created_at AT TIME ZONE 'utc')::date)
            FROM public.arena_results
            WHERE user_id = target_user_id
        ), 0)
        + COALESCE((
            SELECT 3 * LEAST(COUNT(*), 20)
            FROM public.lists l
            WHERE l.user_id = target_user_id
              AND (SELECT COUNT(*) FROM public.list_items i WHERE i.list_id = l.id) >= 3
        ), 0)
    INTO total_xp;

    UPDATE public.profiles
    SET
        xp = total_xp,
        level = public.calculate_level(total_xp)
    WHERE id = target_user_id
      AND (xp IS DISTINCT FROM total_xp OR level IS DISTINCT FROM public.calculate_level(total_xp));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- list_items has no user_id: resolve the list owner
CREATE OR REPLACE FUNCTION public.handle_list_item_xp_change()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
BEGIN
    SELECT user_id INTO owner_id
    FROM public.lists
    WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.list_id ELSE NEW.list_id END;

    PERFORM public.calculate_user_xp(owner_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.calculate_user_xp(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_list_item_xp_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_review_change_update_xp ON public.reviews;
CREATE TRIGGER on_review_change_update_xp
AFTER INSERT OR UPDATE OF comment, user_id OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.handle_xp_change();

DROP TRIGGER IF EXISTS on_arena_result_change_update_xp ON public.arena_results;
CREATE TRIGGER on_arena_result_change_update_xp
AFTER INSERT OR DELETE ON public.arena_results
FOR EACH ROW EXECUTE FUNCTION public.handle_xp_change();

DROP TRIGGER IF EXISTS on_list_change_update_xp ON public.lists;
CREATE TRIGGER on_list_change_update_xp
AFTER INSERT OR DELETE ON public.lists
FOR EACH ROW EXECUTE FUNCTION public.handle_xp_change();

DROP TRIGGER IF EXISTS on_list_item_change_update_xp ON public.list_items;
CREATE TRIGGER on_list_item_change_update_xp
AFTER INSERT OR DELETE ON public.list_items
FOR EACH ROW EXECUTE FUNCTION public.handle_list_item_xp_change();

-- Backfill
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.profiles LOOP
        PERFORM public.calculate_user_xp(r.id);
    END LOOP;
END $$;
