-- AXIS action reliability fixes.
-- Safe to re-run; preserves existing rows.
-- Run as the Neon database owner / migration role, not as axis_app.
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS edited_at timestamptz;
CREATE INDEX IF NOT EXISTS comments_parent_idx ON public.comments (parent_comment_id, created_at ASC);
CREATE INDEX IF NOT EXISTS comment_likes_user_idx ON public.comment_likes (user_id);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages (conversation_id, created_at DESC);
