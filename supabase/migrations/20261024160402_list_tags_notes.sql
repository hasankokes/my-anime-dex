/*
  # Tags and personal notes on list entries (Module 5, premium)

  1. user_anime_list.tags (max 20 tags, each 1-30 chars) and user_anime_list.notes (max 2000 chars).
  2. Writing them is premium-only, enforced server-side by a trigger: an INSERT that sets them or an
     UPDATE that changes them fails unless private.is_premium(auth.uid()). Existing values stay
     readable (and are carried along unchanged by ordinary list updates) after premium lapses.
     Server-side writers without a user JWT (auth.uid() IS NULL, e.g. backup restore) are allowed.
*/

ALTER TABLE public.user_anime_list
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.user_anime_list
  ADD CONSTRAINT user_anime_list_tags_count_check CHECK (cardinality(tags) <= 20),
  ADD CONSTRAINT user_anime_list_notes_check CHECK (notes IS NULL OR char_length(notes) <= 2000);

CREATE OR REPLACE FUNCTION private.enforce_premium_list_tools()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Tag shape (CHECK constraints can't use subqueries)
  IF EXISTS (SELECT 1 FROM unnest(NEW.tags) AS t WHERE t IS NULL OR char_length(t) NOT BETWEEN 1 AND 30) THEN
    RAISE EXCEPTION 'Each tag must be 1-30 characters' USING ERRCODE = '23514';
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF (cardinality(NEW.tags) > 0 OR NEW.notes IS NOT NULL) AND NOT private.is_premium(auth.uid()) THEN
      RAISE EXCEPTION 'Tags and notes require Premium' USING ERRCODE = '42501';
    END IF;
  ELSIF (NEW.tags IS DISTINCT FROM OLD.tags OR NEW.notes IS DISTINCT FROM OLD.notes)
        AND NOT private.is_premium(auth.uid()) THEN
    RAISE EXCEPTION 'Tags and notes require Premium' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER enforce_premium_list_tools
  BEFORE INSERT OR UPDATE ON public.user_anime_list
  FOR EACH ROW EXECUTE FUNCTION private.enforce_premium_list_tools();
