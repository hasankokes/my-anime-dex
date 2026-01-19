/*
  # Reviews Table

  1. New Table
    - `public.reviews`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id)
      - `anime_id` (text, matches Jikan ID)
      - `rating` (integer, 1-5 or 1-10)
      - `comment` (text, max length limit?)
      - `created_at` (timestamp, default now)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `public.reviews`
    - Policy: Public Read
    - Policy: Authenticated User can Insert (their own)
    - Policy: Authenticated User can Update (their own)
    - Policy: Authenticated User can Delete (their own)
    
  3. Indexes
    - Index on `anime_id` for fast lookups.
*/

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  anime_id TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 5 Star system preferred for simplicity
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

  -- One review per anime per user?
  UNIQUE(user_id, anime_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Reviews are viewable by everyone." 
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Users can create their own review." 
  ON public.reviews FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own review." 
  ON public.reviews FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own review." 
  ON public.reviews FOR DELETE USING ((select auth.uid()) = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS reviews_anime_id_idx ON public.reviews(anime_id);
CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON public.reviews(user_id);
