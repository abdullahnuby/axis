-- AXIS internal post sharing / repost support.
-- Safe to run more than once; does not remove existing posts.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS shared_post_id uuid REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE posts ALTER COLUMN body SET DEFAULT '';
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_check;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_check;
ALTER TABLE posts ADD CONSTRAINT posts_content_check CHECK (char_length(body) > 0 OR image_data IS NOT NULL OR shared_post_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS posts_shared_post_idx ON posts (shared_post_id) WHERE shared_post_id IS NOT NULL;
