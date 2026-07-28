
REVOKE SELECT (collab_email) ON public.creator_profiles FROM authenticated;
REVOKE SELECT (collab_email) ON public.creator_profiles FROM anon;
GRANT SELECT (collab_email) ON public.creator_profiles TO service_role;

DROP FUNCTION IF EXISTS public.get_creator_collab_email(uuid);

CREATE OR REPLACE FUNCTION public.get_creator_collab_email(_creator_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_accepts boolean;
  v_status text;
  v_owner uuid;
BEGIN
  SELECT collab_email, accepts_collabs, status, user_id
    INTO v_email, v_accepts, v_status, v_owner
  FROM public.creator_profiles
  WHERE user_id = _creator_user_id;

  IF v_email IS NULL THEN RETURN NULL; END IF;
  IF v_owner = auth.uid() THEN RETURN v_email; END IF;
  IF public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'moderator'::app_role]) THEN
    RETURN v_email;
  END IF;
  IF auth.uid() IS NOT NULL AND v_status = 'approved' AND COALESCE(v_accepts, false) = true THEN
    RETURN v_email;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_creator_collab_email(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creator_collab_email(uuid) TO authenticated;
