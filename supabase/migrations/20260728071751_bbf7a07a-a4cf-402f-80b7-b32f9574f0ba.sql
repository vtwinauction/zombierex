
-- Switch profiles_public to SECURITY INVOKER, grant column-level SELECT on base table, and allow anon reads of public rows
ALTER VIEW public.profiles_public SET (security_invoker = on);

-- Column-scoped grants on base table so invoker view works for anon + authenticated
GRANT SELECT (id, display_name, handle, avatar_url, bio, is_verified, tier, level, followers_count, following_count, posts_count, created_at, is_private, deleted_at)
  ON public.profiles TO anon, authenticated;

-- Anon may read only non-private, non-deleted profiles
DROP POLICY IF EXISTS profiles_anon_read ON public.profiles;
CREATE POLICY profiles_anon_read ON public.profiles
  FOR SELECT TO anon
  USING (deleted_at IS NULL AND COALESCE(is_private, false) = false);

GRANT SELECT ON public.profiles_public TO anon, authenticated;
