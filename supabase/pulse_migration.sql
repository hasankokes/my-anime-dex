-- Migration: Create watch_activity table for Anime Pulse feature

CREATE TABLE IF NOT EXISTS public.watch_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    anime_id INTEGER NOT NULL,
    anime_title TEXT NOT NULL,
    anime_image TEXT,
    action_type TEXT NOT NULL CHECK (action_type IN ('watching', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Btree index on created_at for faster descending sorts
CREATE INDEX IF NOT EXISTS watch_activity_created_at_idx ON public.watch_activity(created_at DESC);

-- Enable RLS
ALTER TABLE public.watch_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read (for the public feed)
CREATE POLICY "Anyone can view watch activity"
    ON public.watch_activity FOR SELECT
    USING (true);

-- Policy: Authenticated users can insert their own activity
CREATE POLICY "Users can insert own watch activity"
    ON public.watch_activity FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Enable Realtime for the table!
-- First, ensure publication exists (it usually does as 'supabase_realtime')
-- If it's not already added:
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_activity;

-- To get the full payload on updates/deletes (optional, but good practice if needed later)
ALTER TABLE public.watch_activity REPLICA IDENTITY FULL;
