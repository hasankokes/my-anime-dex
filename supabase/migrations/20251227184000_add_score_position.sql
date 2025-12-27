/*
  # Add Score and Position to List Items

  ## Query Description:
  Adds `score` and `position` columns to the `list_items` table.

  ## Metadata:
  - Schema-Category: "Feature"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true
*/

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'list_items' AND column_name = 'score') THEN
        ALTER TABLE public.list_items ADD COLUMN score NUMERIC(4,2); -- e.g. 9.85
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'list_items' AND column_name = 'position') THEN
        ALTER TABLE public.list_items ADD COLUMN position INTEGER DEFAULT 0;
    END IF;
END $$;
