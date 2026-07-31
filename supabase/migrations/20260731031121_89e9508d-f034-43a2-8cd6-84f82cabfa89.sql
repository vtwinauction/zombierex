CREATE TABLE public.video_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'cloudflare',
  provider_uid text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'uploading',
  playback_hls text,
  playback_dash text,
  thumbnail_url text,
  duration_seconds numeric,
  width int,
  height int,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_video_assets_owner ON public.video_assets(owner_id);
CREATE INDEX idx_video_assets_post ON public.video_assets(post_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_assets TO authenticated;
GRANT ALL ON public.video_assets TO service_role;

ALTER TABLE public.video_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their video assets"
  ON public.video_assets FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Signed-in users can view ready videos"
  ON public.video_assets FOR SELECT TO authenticated
  USING (status = 'ready');

CREATE TRIGGER trg_video_assets_touch
  BEFORE UPDATE ON public.video_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();