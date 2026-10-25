-- AXIS one-sprint consolidated migration.
-- Run this file ONCE (or re-run safely) on the existing neondb/main branch as the owner.
-- It preserves existing users, posts, comments and memberships.
-- =====================================================================
-- A. Replies and comment likes
-- Source: 20261025_comment_interactions.sql
-- Idempotent migration. Apply as the database owner / migration role.
-- =====================================================================
-- AXIS social interactions migration (safe to re-run).
-- Run as the database owner / migration role, not as axis_app.
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid
  REFERENCES public.comments(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS edited_at timestamptz;

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


-- =====================================================================
-- B. In-platform reposts
-- Source: 20261025_internal_post_sharing.sql
-- Idempotent migration. Apply as the database owner / migration role.
-- =====================================================================
-- AXIS internal post sharing / repost support.
-- Safe to run more than once; does not remove existing posts.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS shared_post_id uuid REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE posts ALTER COLUMN body SET DEFAULT '';
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_check;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_check;
ALTER TABLE posts ADD CONSTRAINT posts_content_check CHECK (char_length(body) > 0 OR image_data IS NOT NULL OR shared_post_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS posts_shared_post_idx ON posts (shared_post_id) WHERE shared_post_id IS NOT NULL;


-- =====================================================================
-- C. Social graph, groups, messaging, email tokens and rate limits
-- Source: 20261025_social_network_sprint.sql
-- Idempotent migration. Apply as the database owner / migration role.
-- =====================================================================
-- AXIS social-network sprint migration. Safe to execute repeatedly; it preserves current data.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT user_follows_no_self CHECK (follower_id <> following_id)
);
CREATE INDEX IF NOT EXISTS user_follows_following_idx ON public.user_follows (following_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.engineering_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 100),
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1200),
  specialty text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','closed')),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS engineering_groups_created_idx ON public.engineering_groups (created_at DESC);
CREATE INDEX IF NOT EXISTS engineering_groups_specialty_idx ON public.engineering_groups (specialty, created_at DESC);
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid NOT NULL REFERENCES public.engineering_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','suspended')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS group_members_user_idx ON public.group_members (user_id, status, joined_at DESC);
CREATE INDEX IF NOT EXISTS group_members_group_idx ON public.group_members (group_id, status, joined_at DESC);

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.engineering_groups(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS posts_group_feed_idx ON public.posts (group_id, created_at DESC) WHERE group_id IS NOT NULL;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_conversation_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_group_id uuid REFERENCES public.engineering_groups(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_kind_check CHECK (kind IN ('like','comment','admin','verification','follow','share','message','group'));

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direct_key text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_updated_idx ON public.conversations (updated_at DESC);
CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS conversation_members_user_idx ON public.conversation_members (user_id, last_read_at DESC);
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages (conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE, expires_at timestamptz NOT NULL, used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_user_idx ON public.password_reset_tokens (user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE, expires_at timestamptz NOT NULL, used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_verification_user_idx ON public.email_verification_tokens (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.axis_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS groups_touch_updated_at ON public.engineering_groups;
CREATE TRIGGER groups_touch_updated_at BEFORE UPDATE ON public.engineering_groups FOR EACH ROW EXECUTE FUNCTION public.axis_touch_updated_at();
DROP TRIGGER IF EXISTS conversations_touch_updated_at ON public.conversations;
CREATE TRIGGER conversations_touch_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.axis_touch_updated_at();


-- Persistent per-subject request throttling for Vercel/serverless instances.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket text NOT NULL,
  subject_hash char(64) NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, subject_hash)
);
CREATE INDEX IF NOT EXISTS rate_limits_updated_idx ON rate_limits (updated_at DESC);
