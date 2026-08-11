DROP POLICY IF EXISTS "Signed-in users can view ready videos" ON public.video_assets;

CREATE POLICY "Members view videos of visible posts"
ON public.video_assets FOR SELECT
TO authenticated
USING (
  status = 'ready'
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = video_assets.post_id
      AND p.deleted_at IS NULL
      AND COALESCE(p.is_hidden, false) = false
  )
);