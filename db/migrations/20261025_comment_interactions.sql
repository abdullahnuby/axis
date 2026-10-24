-- AXIS social interactions migration (safe to re-run).
-- Run as the database owner / migration role, not as axis_app.
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid
  REFERENCES public.comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS comments_parent_idx
  ON public.comments (parent_comment_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS comment_likes_user_idx
  ON public.comment_likes (user_id);
