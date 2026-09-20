-- Arena Pools Table (For storing candidates like Anime, Characters)
CREATE TABLE IF NOT EXISTS public.arena_pools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL, -- e.g. 'all_time_anime', 'shounen_anime', 'waifu', 'husbando'
    item_id INTEGER NOT NULL, -- MAL ID or Character ID
    name TEXT NOT NULL, -- General franchise name (e.g., Attack on Titan) or Character Name
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(category, item_id)
);

-- Arena Stats Table (For storing global win rates of items)
CREATE TABLE IF NOT EXISTS public.arena_stats (
    item_id INTEGER PRIMARY KEY, -- We use item_id as primary since an anime/character is unique
    name TEXT NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    total_matches INTEGER DEFAULT 0,
    type TEXT NOT NULL, -- 'anime' or 'character'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast category lookups
CREATE INDEX IF NOT EXISTS idx_arena_pools_category ON public.arena_pools(category);
CREATE INDEX IF NOT EXISTS idx_arena_stats_wins ON public.arena_stats(wins DESC);
