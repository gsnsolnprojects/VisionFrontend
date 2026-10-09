-- ============================================================================
-- Per-user colour theme
-- ============================================================================
-- Stores each user's chosen palette for the web app:
--   'vision'  — cream / ink / lime (default)
--   'classic' — original blue palette
-- Users already update their own profile row through the existing
-- "Users can update their own profile" policy, so no new RLS policy is needed.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS color_theme TEXT NOT NULL DEFAULT 'vision';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_color_theme_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_color_theme_check CHECK (color_theme IN ('vision', 'classic'));
