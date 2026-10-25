/*
  # Server-driven content cards: polls, announcements, beta sign-ups (Module 7)

  New cards are rows in content_cards (dashboard / SQL); no app update needed. The app renders
  the known types natively and ignores unknown ones (forward compatible).

  content_cards
    type        poll | announcement | beta_signup
    placement   home | discover | profile
    audience    all | premium | free
    locales     language codes to show to; empty = everyone
    title/body  {"en": "...", "tr": "...", ...}; the app falls back to "en"
    payload     poll:          {"options": [{"id": "a", "label": {"en": "..."}}],
                                "show_results": "after_vote" | "after_end" | "always"}
                announcement:  {"image_url"?: "https://...", "cta"?: {"label": {...}, "url": "https://... | /route"}}
                beta_signup:   {"cta"?: {"label": {...}}, "success"?: {...}}
    starts_at / visible_until   when the card is listed (visible_until NULL = until deactivated)
    ends_at                     poll voting deadline (NULL = open while visible)
    priority                    higher first

  poll_votes:   one vote per user and poll; voting is premium-only, before ends_at, for an
                option the poll has. Individual votes are private (own row only);
                totals come from get_poll_results() following the card's show_results rule.
  beta_signups: one per user and card (any signed-in user).
*/

CREATE TABLE IF NOT EXISTS public.content_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('poll', 'announcement', 'beta_signup')),
  placement text NOT NULL DEFAULT 'home' CHECK (placement IN ('home', 'discover', 'profile')),
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'premium', 'free')),
  locales text[] NOT NULL DEFAULT '{}',
  title jsonb NOT NULL,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  visible_until timestamptz,
  priority integer NOT NULL DEFAULT 0,
  dismissible boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read live content cards"
  ON public.content_cards FOR SELECT
  TO anon, authenticated
  USING (active AND starts_at <= now() AND (visible_until IS NULL OR visible_until > now()));

-- Votes
CREATE TABLE IF NOT EXISTS public.poll_votes (
  card_id uuid NOT NULL REFERENCES public.content_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, user_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- True when the card is a live poll that is still open and has this option
CREATE OR REPLACE FUNCTION private.poll_accepts(_card_id uuid, _option_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.content_cards c
    WHERE c.id = _card_id
      AND c.type = 'poll'
      AND c.active
      AND c.starts_at <= now()
      AND (c.ends_at IS NULL OR c.ends_at > now())
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(c.payload -> 'options') o
        WHERE o ->> 'id' = _option_id
      )
  );
$$;

GRANT EXECUTE ON FUNCTION private.poll_accepts(uuid, text) TO authenticated;

CREATE POLICY "Users read their own votes"
  ON public.poll_votes FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Premium users vote in open polls"
  ON public.poll_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND private.is_premium((SELECT auth.uid()))
    AND private.poll_accepts(card_id, option_id)
  );

CREATE OR REPLACE FUNCTION public.get_poll_results(p_card_id uuid)
RETURNS TABLE (option_id text, votes bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_card public.content_cards;
  v_rule text;
BEGIN
  SELECT * INTO v_card FROM public.content_cards c
  WHERE c.id = p_card_id AND c.type = 'poll' AND c.active;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_rule := COALESCE(v_card.payload ->> 'show_results', 'after_vote');
  IF NOT (
    v_rule = 'always'
    OR (v_card.ends_at IS NOT NULL AND v_card.ends_at <= now())
    OR (v_rule = 'after_vote' AND EXISTS (
      SELECT 1 FROM public.poll_votes v WHERE v.card_id = p_card_id AND v.user_id = auth.uid()
    ))
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT v.option_id, count(*)::bigint
  FROM public.poll_votes v
  WHERE v.card_id = p_card_id
  GROUP BY v.option_id;
END;
$$;

-- Beta sign-ups
CREATE TABLE IF NOT EXISTS public.beta_signups (
  card_id uuid NOT NULL REFERENCES public.content_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, user_id)
);

ALTER TABLE public.beta_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own beta sign-ups"
  ON public.beta_signups FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users sign up for live betas"
  ON public.beta_signups FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.content_cards c
      WHERE c.id = card_id AND c.type = 'beta_signup' AND c.active
        AND c.starts_at <= now() AND (c.visible_until IS NULL OR c.visible_until > now())
    )
  );
