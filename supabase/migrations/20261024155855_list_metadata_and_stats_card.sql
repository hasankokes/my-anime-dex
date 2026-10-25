/*
  # List metadata + profile stats card (Module 1)

  1. user_anime_list caches the anime metadata stats (and later the combined list filters) need,
     so they can be computed from Supabase without one AniList request per anime:
       genres text[], studios text[] (main studios), season_year int, format text (Jikan-style type).
     Filled when an entry is written from the anime screen and back-filled in batches by the app
     for older rows. NULL = not fetched yet.
  2. profiles.stats_card: the premium profile stats card settings, off by default.
     {"enabled": false, "items": ["completed", "top_genre", ...]}
*/

ALTER TABLE public.user_anime_list
  ADD COLUMN IF NOT EXISTS genres text[],
  ADD COLUMN IF NOT EXISTS studios text[],
  ADD COLUMN IF NOT EXISTS season_year integer,
  ADD COLUMN IF NOT EXISTS format text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stats_card jsonb NOT NULL DEFAULT '{"enabled": false, "items": []}'::jsonb;

GRANT UPDATE (stats_card) ON public.profiles TO authenticated;
