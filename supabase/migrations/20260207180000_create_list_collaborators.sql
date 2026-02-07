/*
  # List Collaborators Schema

  ## Query Description:
  This migration sets up the schema for list collaborators.
  1. `list_collaborators`: linking table between lists and users who can edit them.

  ## Metadata:
  - Schema-Category: "Feature"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true

  ## Structure Details:
  - Table: public.list_collaborators (id, list_id, user_id, created_at)
  
  ## Security Implications:
  - RLS Enabled.
  - Owners can manage collaborators.
  - Collaborators can view the list and edit items.
*/

-- Create a table for list collaborators
CREATE TABLE IF NOT EXISTS public.list_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID REFERENCES public.lists(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

  -- Ensure unique collaborator per list
  UNIQUE(list_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.list_collaborators ENABLE ROW LEVEL SECURITY;

-- Policies for list_collaborators

-- List owners can view collaborators
CREATE POLICY "List owners can view collaborators." 
  ON public.list_collaborators FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_collaborators.list_id AND lists.user_id = auth.uid()
    )
  );

-- Collaborators can view themselves (to know they are collaborators)
CREATE POLICY "Collaborators can view themselves." 
  ON public.list_collaborators FOR SELECT 
  USING (auth.uid() = user_id);

-- List owners can add collaborators
CREATE POLICY "List owners can add collaborators." 
  ON public.list_collaborators FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_collaborators.list_id AND lists.user_id = auth.uid()
    )
  );

-- List owners can remove collaborators
CREATE POLICY "List owners can remove collaborators." 
  ON public.list_collaborators FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_collaborators.list_id AND lists.user_id = auth.uid()
    )
  );
  
-- Collaborators can remove themselves
CREATE POLICY "Collaborators can remove themselves." 
  ON public.list_collaborators FOR DELETE 
  USING (auth.uid() = user_id);


-- UPDATE EXISTING POLICIES FOR LISTS AND ITEMS TO INCLUDE COLLABORATORS

-- Allow collaborators to view private lists
CREATE POLICY "Collaborators can view private lists." 
  ON public.lists FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.list_collaborators
      WHERE list_collaborators.list_id = lists.id AND list_collaborators.user_id = auth.uid()
    )
  );

-- Allow collaborators to insert items into the list
CREATE POLICY "Collaborators can insert items." 
  ON public.list_items FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.list_collaborators
      WHERE list_collaborators.list_id = list_items.list_id AND list_collaborators.user_id = auth.uid()
    )
  );

-- Allow collaborators to update items in the list
CREATE POLICY "Collaborators can update items." 
  ON public.list_items FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.list_collaborators
      WHERE list_collaborators.list_id = list_items.list_id AND list_collaborators.user_id = auth.uid()
    )
  );

-- Allow collaborators to delete items from the list
CREATE POLICY "Collaborators can delete items." 
  ON public.list_items FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.list_collaborators
      WHERE list_collaborators.list_id = list_items.list_id AND list_collaborators.user_id = auth.uid()
    )
  );
