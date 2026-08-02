-- 1. Anonymous analytics ingestion (screen views before sign-in)
GRANT INSERT ON public.analytics_events TO anon;
DROP POLICY IF EXISTS analytics_anon_insert ON public.analytics_events;
CREATE POLICY analytics_anon_insert ON public.analytics_events
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

-- 2. Hide moderated posts from public reads
DROP POLICY IF EXISTS posts_public_read ON public.posts;
CREATE POLICY posts_public_read ON public.posts
  FOR SELECT USING (
    deleted_at IS NULL
    AND COALESCE(is_hidden, false) = false
    AND (story_expires_at IS NULL OR story_expires_at > now())
  );

-- 3. Stop leaking contact PII to anonymous visitors (column-level grants)
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, handle, display_name, bio, avatar_url, cover_url, tier, location, website,
  is_verified, followers_count, following_count, posts_count, created_at, updated_at, deleted_at,
  seller_rating_avg, seller_reviews_count, listings_count, xp_total, level, streak_days,
  last_checkin_at, is_premium, profile_theme, featured_badge_slug, referral_code, is_suspended,
  suspended_reason, suspended_at, suspended_by, verified_at, verified_by, contact_dm_enabled,
  is_business, is_private, allow_messages) ON public.profiles TO anon;

-- 4. Scope challenge vote visibility to club members
DROP POLICY IF EXISTS "Anyone can read votes" ON public.challenge_entry_votes;
CREATE POLICY challenge_votes_member_read ON public.challenge_entry_votes
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.challenge_entries ce
      JOIN public.weekly_challenges wc ON wc.id = ce.challenge_id
      WHERE ce.id = challenge_entry_votes.entry_id
        AND public.is_club_member(wc.club_id, auth.uid())
    )
  );