-- Safe, additive migration for an admin-only main-feed pinned announcement.
-- Exactly one non-group post may be pinned in the main feed at a time.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS main_feed_pinned_at timestamptz;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS main_feed_pinned_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_main_feed_pin_idx
  ON public.posts (main_feed_pinned_at DESC)
  WHERE main_feed_pinned_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS posts_single_main_feed_pin_idx
  ON public.posts ((1))
  WHERE main_feed_pinned_at IS NOT NULL;
