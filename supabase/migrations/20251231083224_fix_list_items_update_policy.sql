-- Fix List Items Update Policy
-- Adds missing UPDATE policy for `list_items` table.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'list_items' 
        AND policyname = 'Users can update items in their own lists.'
    ) THEN
        CREATE POLICY "Users can update items in their own lists." 
          ON public.list_items FOR UPDATE 
          USING (
            EXISTS (
              SELECT 1 FROM public.lists
              WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()
            )
          );
    END IF;
END $$;
