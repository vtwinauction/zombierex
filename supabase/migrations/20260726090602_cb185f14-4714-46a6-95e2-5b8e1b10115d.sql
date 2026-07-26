CREATE TABLE public.crash_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message text NOT NULL,
  stack text,
  route text,
  user_agent text,
  platform text,
  app_version text,
  mechanism text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.crash_reports TO anon, authenticated;
GRANT ALL ON public.crash_reports TO service_role;

ALTER TABLE public.crash_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_insert_crash" ON public.crash_reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admins_read_crash" ON public.crash_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_crash_reports_created_at ON public.crash_reports(created_at DESC);
CREATE INDEX idx_crash_reports_user ON public.crash_reports(user_id, created_at DESC);