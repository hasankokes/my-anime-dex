/*
  # Add Score and Comment to List Items

  ## Query Description:
  Adds `user_score` and `user_comment` columns to the `list_items` table.

  ## Metadata:
  - Schema-Category: "Feature"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true
*/

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'list_items' AND column_name = 'user_score') THEN
        ALTER TABLE public.list_items ADD COLUMN user_score INTEGER CHECK (user_score >= 1 AND user_score <= 10);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'list_items' AND column_name = 'user_comment') THEN
        ALTER TABLE public.list_items ADD COLUMN user_comment TEXT;
    END IF;
END $$;
