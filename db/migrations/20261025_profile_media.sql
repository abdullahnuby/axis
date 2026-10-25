-- AXIS profile avatar and cover uploads. Additive and safe to re-run.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_image_data bytea;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_image_mime text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cover_image_data bytea;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cover_image_mime text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_avatar_image_mime_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_avatar_image_mime_check CHECK (avatar_image_mime IS NULL OR avatar_image_mime IN ('image/jpeg','image/png','image/webp'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_cover_image_mime_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_cover_image_mime_check CHECK (cover_image_mime IS NULL OR cover_image_mime IN ('image/jpeg','image/png','image/webp'));
  END IF;
END $$;
