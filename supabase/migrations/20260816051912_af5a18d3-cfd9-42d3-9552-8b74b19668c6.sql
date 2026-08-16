CREATE OR REPLACE FUNCTION public.marketplace_object_is_public(_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listing_photos lp
    JOIN public.listings l ON l.id = lp.listing_id
    WHERE l.status = 'active'
      AND (lp.url LIKE '%' || _object_name OR lp.thumbnail_url LIKE '%' || _object_name)
  ) OR EXISTS (
    SELECT 1
    FROM public.listings l
    WHERE l.status = 'active'
      AND l.hero_image_url LIKE '%' || _object_name
  );
$$;

REVOKE ALL ON FUNCTION public.marketplace_object_is_public(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_object_is_public(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "marketplace_read" ON storage.objects;
CREATE POLICY "marketplace_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'marketplace'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR public.marketplace_object_is_public(name)
  )
);