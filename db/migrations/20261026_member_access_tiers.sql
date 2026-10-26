-- AXIS progressive access tiers for posts.
-- Existing posts remain verified-only because the new column defaults to 'verified'.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS access_level text NOT NULL DEFAULT 'verified';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'posts_access_level_check'
      AND conrelid = 'public.posts'::regclass
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_access_level_check CHECK (access_level IN ('members','verified'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS posts_access_level_feed_idx
  ON public.posts (access_level, created_at DESC);
