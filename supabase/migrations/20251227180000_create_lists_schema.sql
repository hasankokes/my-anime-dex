/*
  # User Lists Schema

  ## Query Description:
  This migration sets up the schema for user-created lists.
  1. `lists`: Stores the lists created by users (title, description, visibility).
  2. `list_items`: Stores the anime items within those lists.

  ## Metadata:
  - Schema-Category: "Feature"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true

  ## Structure Details:
  - Table: public.lists (id, user_id, title, description, is_public, likes_count, created_at)
  - Table: public.list_items (id, list_id, anime_id, anime_title, anime_image, added_at)
  
  ## Security Implications:
  - RLS Enabled on all tables.
  - Public lists are viewable by everyone.
  - Private lists are only viewable by the owner.
  - CRUD operations restricted to the owner by default.
*/

-- Create a table for lists
CREATE TABLE IF NOT EXISTS public.lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

  CONSTRAINT title_length CHECK (char_length(title) >= 1)
);

-- Create a table for list items
CREATE TABLE IF NOT EXISTS public.list_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID REFERENCES public.lists(id) ON DELETE CASCADE NOT NULL,
  anime_id TEXT NOT NULL, -- MAL ID
  anime_title TEXT, -- Cached title
  anime_image TEXT, -- Cached image
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Ensure unique anime per list
  UNIQUE(list_id, anime_id)
);

-- Enable Row Level Security
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

-- Policies for Lists

-- Everyone can view public lists
CREATE POLICY "Public lists are viewable by everyone." 
  ON public.lists FOR SELECT USING (is_public = true);

-- Users can view their own private lists
CREATE POLICY "Users can view their own lists." 
  ON public.lists FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own lists
CREATE POLICY "Users can insert their own lists." 
  ON public.lists FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own lists
CREATE POLICY "Users can update their own lists." 
  ON public.lists FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own lists
CREATE POLICY "Users can delete their own lists." 
  ON public.lists FOR DELETE USING (auth.uid() = user_id);


-- Policies for List Items

-- Items in public lists are viewable by everyone
-- Note: This requires a join or a check against the parent list. 
-- Supabase RLS with joins can be expensive, but cleaner:
CREATE POLICY "Items in public lists are viewable by everyone." 
  ON public.list_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_items.list_id AND lists.is_public = true
    )
  );

-- Users can view items in their own lists
CREATE POLICY "Users can view items in their own lists." 
  ON public.list_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()
    )
  );

-- Users can insert items into their own lists
CREATE POLICY "Users can insert items into their own lists." 
  ON public.list_items FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()
    )
  );

-- Users can delete items from their own lists
CREATE POLICY "Users can delete items from their own lists." 
  ON public.list_items FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()
    )
  );
