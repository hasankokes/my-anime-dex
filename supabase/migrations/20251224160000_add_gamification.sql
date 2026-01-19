/*
  # Gamification System (XP & Levels)

  ## Query Description:
  Adds XP tracking to user profiles and automates level calculation.
  
  1. Updates `profiles` table:
     - Adds `xp` column (default 0).
  
  2. Functions:
     - `calculate_level(xp)`: Returns level based on XP.
       - Levels 1-10: 30 XP per level.
       - Levels 10+: 50 XP per level.
     - `calculate_user_xp(user_id)`: Aggregates points from `user_anime_list`.
       - Favorite: +1
       - Plan to Watch: +1
       - Watching: +2
       - Completed: +3
     - `update_profile_xp_trigger()`: Trigger function to update profile XP/Level on list changes.

  3. Triggers:
     - `on_user_anime_list_change`: Fires on INSERT/UPDATE/DELETE on `user_anime_list`.
*/

-- 1. Add XP column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;

-- 2. Function to calculate level from XP
CREATE OR REPLACE FUNCTION public.calculate_level(current_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
    lvl INTEGER := 1;
    remaining_xp INTEGER := current_xp;
BEGIN
    -- Levels 1-10: 30 XP each
    IF remaining_xp < (9 * 30) THEN
        lvl := 1 + (remaining_xp / 30);
        RETURN lvl;
    ELSE
        lvl := 10;
        remaining_xp := remaining_xp - (9 * 30); -- Remove XP for first 10 levels (which is actually 9 steps: 1->2...9->10)
        -- Wait, logic check:
        -- Lvl 1: 0-29
        -- Lvl 2: 30-59
        -- ...
        -- Lvl 10: 270-299
        -- So 9 steps of 30XP = 270XP.
        
        -- Levels 10+: 50 XP each
        lvl := lvl + (remaining_xp / 50);
        RETURN lvl;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- 3. Function to calculate User XP based on list
CREATE OR REPLACE FUNCTION public.calculate_user_xp(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    total_xp INTEGER := 0;
BEGIN
    -- Calculate generic points
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN status = 'completed' THEN 3
                WHEN status = 'watching' THEN 2
                WHEN status = 'plan_to_watch' THEN 1
                ELSE 0 
            END + 
            CASE 
                WHEN is_favorite = true THEN 1
                ELSE 0
            END
        ), 0)
    INTO total_xp
    FROM public.user_anime_list
    WHERE user_id = target_user_id;

    -- Update Profile
    UPDATE public.profiles
    SET 
        xp = total_xp,
        level = public.calculate_level(total_xp)
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Trigger Function
CREATE OR REPLACE FUNCTION public.handle_xp_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM public.calculate_user_xp(OLD.user_id);
    ELSE
        PERFORM public.calculate_user_xp(NEW.user_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create Trigger
DROP TRIGGER IF EXISTS on_list_change_update_xp ON public.user_anime_list;
CREATE TRIGGER on_list_change_update_xp
AFTER INSERT OR UPDATE OR DELETE ON public.user_anime_list
FOR EACH ROW EXECUTE PROCEDURE public.handle_xp_change();

-- 6. Backfill existing users (Optional, but good for consistency)
DO $$
DECLARE 
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.profiles
    LOOP
        PERFORM public.calculate_user_xp(r.id);
    END LOOP;
END $$;
