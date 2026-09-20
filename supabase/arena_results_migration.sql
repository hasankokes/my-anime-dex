-- Arena Results Table (For saving completed quiz results)
-- Stores each user's quiz completion with winner info and optional rating
CREATE TABLE IF NOT EXISTS public.arena_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL for anonymous plays
    category TEXT NOT NULL,
    size INTEGER NOT NULL,
    winner_id INTEGER NOT NULL,
    winner_name TEXT NOT NULL,
    winner_image TEXT NOT NULL,
    rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),  -- 1-5 stars, 0 = not rated
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_arena_results_user ON public.arena_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_results_category ON public.arena_results(category, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.arena_results ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT (anonymous plays have user_id = NULL)
CREATE POLICY "Anyone can insert arena results"
    ON public.arena_results FOR INSERT
    WITH CHECK (true);

-- Anyone can read all results (for community stats)
CREATE POLICY "Anyone can read arena results"
    ON public.arena_results FOR SELECT
    USING (true);

-- Only the owner can update their own results (for rating)
CREATE POLICY "Users can update own arena results"
    ON public.arena_results FOR UPDATE
    USING (auth.uid() = user_id);
