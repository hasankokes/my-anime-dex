/*
  # Add Score to User Anime List

  ## Query Description:
  Adds a `score` column to the `user_anime_list` table to cache the anime's score (e.g., from MyAnimeList/Jikan).
  This allows sorting by score and displaying it in the favorites list without fetching details for each item again.

  ## Structure Details:
  - Table: public.user_anime_list
  - Column: score (DOUBLE PRECISION or NUMERIC, nullable)
*/

ALTER TABLE public.user_anime_list 
ADD COLUMN IF NOT EXISTS score DOUBLE PRECISION;
