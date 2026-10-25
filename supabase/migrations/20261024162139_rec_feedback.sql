/*
  # "Don't recommend this" feedback (Module 3, premium smart recommendations)

  rec_feedback stores the anime a user rejected from the premium "For you" list, with a snapshot
  of its genres and themes so similar shows can be pushed down without another AniList lookup.
  Synced across devices (the free "Not interested" stays a local hide).

  - Owners read/delete their own rows; adding one requires premium (private.is_premium).
  - anime_id uses the app-wide id (MAL id when AniList has one, else the AniList id);
    anilist_id is kept for matching AniList media directly.
*/

CREATE TABLE IF NOT EXISTS public.rec_feedback (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anime_id text NOT NULL,
  anilist_id integer,
  title text,
  genres text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, anime_id),
  CONSTRAINT rec_feedback_sizes_check CHECK (
    cardinality(genres) <= 20 AND cardinality(tags) <= 20 AND (title IS NULL OR char_length(title) <= 300)
  )
);

ALTER TABLE public.rec_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own rec feedback"
  ON public.rec_feedback FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Premium users add rec feedback"
  ON public.rec_feedback FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND private.is_premium((SELECT auth.uid())));

CREATE POLICY "Users delete their own rec feedback"
  ON public.rec_feedback FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
