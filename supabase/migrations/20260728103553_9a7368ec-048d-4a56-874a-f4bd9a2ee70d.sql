CREATE TABLE public.saved_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_collections TO authenticated;
GRANT ALL ON public.saved_collections TO service_role;

ALTER TABLE public.saved_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_collections_own_select"
  ON public.saved_collections FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "saved_collections_own_insert"
  ON public.saved_collections FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_collections_own_update"
  ON public.saved_collections FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_collections_own_delete"
  ON public.saved_collections FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_saved_collections_user ON public.saved_collections(user_id, sort_order);

CREATE TABLE public.saved_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.saved_collections(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, post_id)
);

GRANT SELECT, INSERT, DELETE ON public.saved_collection_items TO authenticated;
GRANT ALL ON public.saved_collection_items TO service_role;

ALTER TABLE public.saved_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_collection_items_own_select"
  ON public.saved_collection_items FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "saved_collection_items_own_insert"
  ON public.saved_collection_items FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_collection_items_own_delete"
  ON public.saved_collection_items FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_saved_collection_items_collection ON public.saved_collection_items(collection_id, created_at DESC);
CREATE INDEX idx_saved_collection_items_post ON public.saved_collection_items(post_id);

CREATE OR REPLACE FUNCTION public.touch_saved_collection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER saved_collections_updated_at
  BEFORE UPDATE ON public.saved_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_saved_collection();

REVOKE ALL ON FUNCTION public.touch_saved_collection() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_saved_collection() TO authenticated;