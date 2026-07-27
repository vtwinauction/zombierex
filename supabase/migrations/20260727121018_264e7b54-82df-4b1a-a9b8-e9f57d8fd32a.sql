ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_messages text NOT NULL DEFAULT 'followers';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_allow_messages_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_allow_messages_check
  CHECK (allow_messages IN ('everyone','followers','none'));