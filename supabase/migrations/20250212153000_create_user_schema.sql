/*
  # User Profile and Anime List Schema

  ## Query Description:
  This migration sets up the core user data structure.
  1. `profiles`: Extends auth.users to store public profile info (avatar, level, etc.).
  2. `user_anime_list`: The main table to track user interactions with anime (favorites, watching status, progress).
  3. Triggers: Automatically creates a profile entry when a new user signs up via Supabase Auth.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true

  ## Structure Details:
  - Table: public.profiles (id, username, avatar_url, level, created_at)
  - Table: public.user_anime_list (id, user_id, anime_id, status, is_favorite, current_episode, etc.)
  
  ## Security Implications:
  - RLS Enabled on all tables.
  - Policies allow users to select/update/insert only their own rows.
*/

-- Create a table for public profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  member_since TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Create a table for tracking anime (Favorites, Watchlist, History)
CREATE TABLE IF NOT EXISTS public.user_anime_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  anime_id TEXT NOT NULL, -- Can be an external API ID or internal ID
  anime_title TEXT, -- Cached title for display
  anime_image TEXT, -- Cached image for display
  
  -- Status tracking
  status TEXT CHECK (status IN ('watching', 'completed', 'plan_to_watch', 'dropped', 'paused')),
  is_favorite BOOLEAN DEFAULT false,
  
  -- Progress tracking
  current_episode INTEGER DEFAULT 0,
  total_episodes INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Ensure a user can't have duplicate entries for the same anime
  UNIQUE(user_id, anime_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_anime_list ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone." 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for Anime List
CREATE POLICY "Users can view their own list." 
  ON public.user_anime_list FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own list." 
  ON public.user_anime_list FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own list." 
  ON public.user_anime_list FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own list." 
  ON public.user_anime_list FOR DELETE USING (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
