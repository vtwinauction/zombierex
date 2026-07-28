-- 1) Column-level restriction: hide contact PII from anonymous visitors
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, handle, display_name, bio, avatar_url, cover_url, tier, location, website,
  is_verified, followers_count, following_count, posts_count, created_at, updated_at,
  deleted_at, seller_rating_avg, seller_reviews_count, listings_count, xp_total, level,
  streak_days, last_checkin_at, is_premium, profile_theme, featured_badge_slug,
  referral_code, is_suspended, suspended_reason, suspended_at, suspended_by,
  verified_at, verified_by, contact_dm_enabled, is_business, is_private, allow_messages
) ON public.profiles TO anon;

-- 2) anon should never hold write privileges on public tables (RLS already blocks, remove the grant too)
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'r' AND n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon', t.relname);
  END LOOP;
END $$;

-- 3) Trigger helper functions are not meant to be callable through the API
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;