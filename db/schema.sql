-- AXIS initial schema. Safe to run repeatedly; use npm run db:migrate.

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin','reviewer','moderator')),
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','pending','needs_info','rejected','verified')),
  account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','suspended')),
  specialty text,
  bio text,
  job_title text,
  approved_years numeric(4,1),
  seniority_code text NOT NULL DEFAULT 'JNR' CHECK (seniority_code IN ('JNR','MID','SNR','EXP')),
  verified_badges text[] NOT NULL DEFAULT '{}',
  avatar_color text NOT NULL DEFAULT '#1B4F8F',
  avatar_image_data bytea,
  avatar_image_mime text CHECK (avatar_image_mime IS NULL OR avatar_image_mime IN ('image/jpeg','image/png','image/webp')),
  cover_image_data bytea,
  cover_image_mime text CHECK (cover_image_mime IS NULL OR cover_image_mime IN ('image/jpeg','image/png','image/webp')),
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_status_idx ON users (verification_status, created_at DESC);
CREATE INDEX IF NOT EXISTS users_specialty_idx ON users (specialty);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_image_data bytea;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_image_mime text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_image_data bytea;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_image_mime text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_avatar_image_mime_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_avatar_image_mime_check CHECK (avatar_image_mime IS NULL OR avatar_image_mime IN ('image/jpeg','image/png','image/webp'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_cover_image_mime_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_cover_image_mime_check CHECK (cover_image_mime IS NULL OR cover_image_mime IN ('image/jpeg','image/png','image/webp'));
  END IF;
END $$;

-- Professional community relationships and interest groups.
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT user_follows_no_self CHECK (follower_id <> following_id)
);
CREATE INDEX IF NOT EXISTS user_follows_following_idx ON user_follows (following_id, created_at DESC);

CREATE TABLE IF NOT EXISTS engineering_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 100),
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1200),
  specialty text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','closed')),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS engineering_groups_created_idx ON engineering_groups (created_at DESC);
CREATE INDEX IF NOT EXISTS engineering_groups_specialty_idx ON engineering_groups (specialty, created_at DESC);

CREATE TABLE IF NOT EXISTS group_members (
  group_id uuid NOT NULL REFERENCES engineering_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','suspended')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS group_members_user_idx ON group_members (user_id, status, joined_at DESC);
CREATE INDEX IF NOT EXISTS group_members_group_idx ON group_members (group_id, status, joined_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_user_idx ON password_reset_tokens (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_verification_user_idx ON email_verification_tokens (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at);

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

CREATE TABLE IF NOT EXISTS login_attempts (
  identifier text NOT NULL,
  ip_address text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  PRIMARY KEY (identifier, ip_address)
);

CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  membership_number_encrypted text NOT NULL,
  membership_fingerprint char(64) NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','needs_info','approved','rejected')),
  applicant_note text,
  review_note text,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_status_idx ON verification_requests (status, created_at ASC);

CREATE TABLE IF NOT EXISTS verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('membership','experience','degree','certificate','other')),
  original_name text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('application/pdf','image/jpeg','image/png','image/webp')),
  content bytea NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 2500000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_documents_request_idx ON verification_documents (request_id, category);

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 5000),
  specialty text,
  image_data bytea,
  image_mime text CHECK (image_mime IS NULL OR image_mime IN ('image/jpeg','image/png','image/webp')),
  image_name text,
  shared_post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  group_id uuid REFERENCES engineering_groups(id) ON DELETE CASCADE,
  pinned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posts_content_check CHECK (char_length(body) > 0 OR image_data IS NOT NULL OR shared_post_id IS NOT NULL)
);
-- Upgrade existing Neon databases without deleting posts: a repost may contain no caption or image of its own.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS shared_post_id uuid REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES engineering_groups(id) ON DELETE CASCADE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pinned_at timestamptz;
ALTER TABLE posts ALTER COLUMN body SET DEFAULT '';
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_check;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_check;
ALTER TABLE posts ADD CONSTRAINT posts_content_check CHECK (char_length(body) > 0 OR image_data IS NOT NULL OR shared_post_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS posts_feed_idx ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_author_idx ON posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_specialty_idx ON posts (specialty, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_shared_post_idx ON posts (shared_post_id) WHERE shared_post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_group_feed_idx ON posts (group_id, created_at DESC) WHERE group_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS posts_one_pinned_personal_per_author_idx ON posts (author_id) WHERE pinned_at IS NOT NULL AND group_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS posts_one_pinned_group_idx ON posts (group_id) WHERE pinned_at IS NOT NULL AND group_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS post_likes (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS post_likes_user_idx ON post_likes (user_id);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1200),
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);
-- Upgrade existing Neon databases without deleting comments.
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS edited_at timestamptz;
CREATE INDEX IF NOT EXISTS comments_post_idx ON comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments (parent_comment_id, created_at ASC);

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS comment_likes_user_idx ON comment_likes (user_id);

-- One-to-one private conversations (group chats can be layered on the same model later).
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direct_key text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_updated_idx ON conversations (updated_at DESC);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS conversation_members_user_idx ON conversation_members (user_id, last_read_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  location text,
  event_url text,
  starts_at timestamptz,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_starts_idx ON events (starts_at NULLS LAST, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('like','comment','admin','verification','follow','share','message','group')),
  message text NOT NULL,
  target_post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  target_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  target_conversation_id uuid,
  target_group_id uuid REFERENCES engineering_groups(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, is_read, created_at DESC);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_conversation_id uuid;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_group_id uuid REFERENCES engineering_groups(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check CHECK (kind IN ('like','comment','admin','verification','follow','share','message','group'));


CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('post','comment','user')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed','actioned')),
  admin_note text,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);

-- This function is not a security boundary; API routes enforce verification and roles as well.
CREATE OR REPLACE FUNCTION axis_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER users_touch_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION axis_touch_updated_at();
CREATE OR REPLACE TRIGGER verification_touch_updated_at BEFORE UPDATE ON verification_requests FOR EACH ROW EXECUTE FUNCTION axis_touch_updated_at();
CREATE OR REPLACE TRIGGER posts_touch_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION axis_touch_updated_at();
CREATE OR REPLACE TRIGGER groups_touch_updated_at BEFORE UPDATE ON engineering_groups FOR EACH ROW EXECUTE FUNCTION axis_touch_updated_at();
CREATE OR REPLACE TRIGGER conversations_touch_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION axis_touch_updated_at();
CREATE OR REPLACE TRIGGER events_touch_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION axis_touch_updated_at();
