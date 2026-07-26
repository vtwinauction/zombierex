CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios','android','web')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_tokens_token_unique UNIQUE (token)
);
CREATE INDEX IF NOT EXISTS device_tokens_user_idx ON public.device_tokens (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens TO authenticated;
GRANT ALL ON public.device_tokens TO service_role;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "device_tokens_self_select" ON public.device_tokens;
CREATE POLICY "device_tokens_self_select" ON public.device_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "device_tokens_self_insert" ON public.device_tokens;
CREATE POLICY "device_tokens_self_insert" ON public.device_tokens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "device_tokens_self_update" ON public.device_tokens;
CREATE POLICY "device_tokens_self_update" ON public.device_tokens FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "device_tokens_self_delete" ON public.device_tokens;
CREATE POLICY "device_tokens_self_delete" ON public.device_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);