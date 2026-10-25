-- Add one pinned post per personal profile and one per group without changing existing posts.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS posts_one_pinned_personal_per_author_idx
  ON public.posts (author_id)
  WHERE pinned_at IS NOT NULL AND group_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS posts_one_pinned_group_idx
  ON public.posts (group_id)
  WHERE pinned_at IS NOT NULL AND group_id IS NOT NULL;
