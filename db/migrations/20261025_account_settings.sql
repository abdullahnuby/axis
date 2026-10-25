-- AXIS account preferences: persisted language and accessible display options.
-- Additive, safe to run repeatedly; existing users remain Arabic by default.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferred_locale text NOT NULL DEFAULT 'ar',
  ADD COLUMN IF NOT EXISTS ui_preferences jsonb NOT NULL DEFAULT '{"compactMode": false, "reduceMotion": false}'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_preferred_locale_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_preferred_locale_check CHECK (preferred_locale IN ('ar','en'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_ui_preferences_object_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_ui_preferences_object_check CHECK (jsonb_typeof(ui_preferences) = 'object');
  END IF;
END $$;
