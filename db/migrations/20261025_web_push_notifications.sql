-- AXIS opt-in web push subscriptions. Safe to re-run; no existing user data is removed.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE CHECK (char_length(endpoint) <= 4096),
  p256dh text NOT NULL,
  auth text NOT NULL,
  expiration_time bigint,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions (user_id, updated_at DESC);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'axis_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO axis_app';
  END IF;
END $$;
