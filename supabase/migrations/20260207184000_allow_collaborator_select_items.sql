/*
  # Allow Collaborators to View List Items
  
  ## Problem
  Collaborators could view the list metadata (title, etc.) but not the items within the list.
  This is because there was no RLS policy on `list_items` allowing SELECT for collaborators.

  ## Solution
  Add a policy to `list_items` allowing SELECT if the user is a collaborator on the parent list.
*/

CREATE POLICY "Collaborators can view list items." 
  ON public.list_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.list_collaborators
      WHERE list_collaborators.list_id = list_items.list_id 
      AND list_collaborators.user_id = auth.uid()
    )
  );
