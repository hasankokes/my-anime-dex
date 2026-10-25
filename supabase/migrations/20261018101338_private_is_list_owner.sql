/*
  # Move is_list_owner out of the exposed API schema

  Security advisor: `public.is_list_owner(uuid)` is SECURITY DEFINER and callable
  by anon/authenticated via PostgREST RPC (/rest/v1/rpc/is_list_owner).

  It is used only by the three "List owners ..." policies on list_collaborators.
  Simply revoking EXECUTE from anon is NOT safe: those policies apply to role
  `public`, so an anon SELECT on lists/list_items (public lists) reaches the
  list_collaborators policies through the "Collaborators can ..." subqueries and
  would fail with "permission denied for function is_list_owner".

  ## Changes
  1. Create schema `private` (not exposed by PostgREST) with the same function.
  2. Execute only for authenticated (policies run as the calling role).
  3. Re-create the three owner policies on list_collaborators, scoped TO
     authenticated, using private.is_list_owner. anon never evaluates them
     (auth.uid() is NULL for anon, so they could never match anyway).
  4. Drop public.is_list_owner (no other dependents; DROP without CASCADE
     fails if that ever changes).
*/

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_list_owner(_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lists
    WHERE id = _list_id AND user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION private.is_list_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_list_owner(uuid) TO authenticated;

DROP POLICY IF EXISTS "List owners can view collaborators." ON public.list_collaborators;
DROP POLICY IF EXISTS "List owners can add collaborators." ON public.list_collaborators;
DROP POLICY IF EXISTS "List owners can remove collaborators." ON public.list_collaborators;

CREATE POLICY "List owners can view collaborators."
  ON public.list_collaborators FOR SELECT TO authenticated
  USING ( private.is_list_owner(list_id) );

CREATE POLICY "List owners can add collaborators."
  ON public.list_collaborators FOR INSERT TO authenticated
  WITH CHECK ( private.is_list_owner(list_id) );

CREATE POLICY "List owners can remove collaborators."
  ON public.list_collaborators FOR DELETE TO authenticated
  USING ( private.is_list_owner(list_id) );

DROP FUNCTION public.is_list_owner(uuid);
