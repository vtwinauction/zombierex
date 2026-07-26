
-- =====================================================================
-- 1. AD_CAMPAIGNS: remove broad public read; expose safe view instead
-- =====================================================================
DROP POLICY IF EXISTS "Anyone reads active campaigns" ON public.ad_campaigns;

CREATE OR REPLACE VIEW public.ad_campaigns_public
WITH (security_invoker = true) AS
SELECT id, name, status, placements, objective, vendor_id, owner_id, currency
FROM public.ad_campaigns
WHERE status = 'active';

-- Owner/admin already read full rows via existing policies; add a policy
-- to allow the view (running as invoker) to still return active rows for
-- anon/authenticated but only through the view's column list.
CREATE POLICY "Public read via safe view"
  ON public.ad_campaigns FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- Revoke direct column access to sensitive fields for anon/authenticated;
-- they can still read the whole row via RLS but the view is the intended path.
REVOKE SELECT (budget_daily_cents, budget_total_cents, spent_cents,
               targeting, geo_countries, geo_cities, interests,
               age_min, age_max, impressions_count, clicks_count,
               engagements_count, start_at, end_at)
  ON public.ad_campaigns FROM anon, authenticated;
GRANT SELECT (id, name, status, placements, objective, vendor_id, owner_id,
              currency, created_at, updated_at)
  ON public.ad_campaigns TO anon, authenticated;

GRANT SELECT ON public.ad_campaigns_public TO anon, authenticated;

-- =====================================================================
-- 2. ADVERTISEMENTS: remove public read of full row; expose safe view
-- =====================================================================
DROP POLICY IF EXISTS ads_read ON public.advertisements;

CREATE OR REPLACE VIEW public.advertisements_public
WITH (security_invoker = true) AS
SELECT id, vendor_id, title, media_url, target_url, is_active, starts_at, ends_at
FROM public.advertisements
WHERE is_active = true;

CREATE POLICY ads_read_safe
  ON public.advertisements FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

REVOKE SELECT (budget_cents) ON public.advertisements FROM anon, authenticated;
GRANT SELECT (id, vendor_id, title, media_url, target_url, is_active,
              starts_at, ends_at, created_at)
  ON public.advertisements TO anon, authenticated;

GRANT SELECT ON public.advertisements_public TO anon, authenticated;

-- =====================================================================
-- 3. CLUB_MEMBERS: prevent self-elevation to owner/moderator
-- =====================================================================
DROP POLICY IF EXISTS club_members_self_join ON public.club_members;

CREATE POLICY club_members_self_join
  ON public.club_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'member'
  );

-- Existing staff may add other members with any role
CREATE POLICY club_members_staff_insert
  ON public.club_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_club_staff(club_id, auth.uid()));

-- =====================================================================
-- 4. PREMIUM_MEMBERSHIPS: remove self-insert (webhook/service role only)
-- =====================================================================
DROP POLICY IF EXISTS pm_own_insert ON public.premium_memberships;

-- =====================================================================
-- 5. SUBSCRIPTIONS (vendor plans): remove self-insert
-- =====================================================================
DROP POLICY IF EXISTS subs_owner_insert ON public.subscriptions;

-- =====================================================================
-- 6. CREATOR_SUBSCRIPTIONS: remove self-insert
-- =====================================================================
DROP POLICY IF EXISTS cs_self_insert ON public.creator_subscriptions;

-- =====================================================================
-- 7. USER_ACHIEVEMENTS: hide progress from anonymous visitors
-- =====================================================================
DROP POLICY IF EXISTS ua_read_public ON public.user_achievements;

CREATE POLICY ua_read_authenticated
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================================
-- 8. Lock down trigger-only SECURITY DEFINER functions from direct RPC
--    (they still fire from triggers, which run as the owner)
-- =====================================================================
REVOKE EXECUTE ON FUNCTION public.apply_xp_event()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_ad_campaign_counters()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_challenge_entries()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_challenge_entry_votes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_creator_subscribers()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_creator_tips_total()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_event_counts()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_follow_counts()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_listing_photos_count()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_listing_saves()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_listings_count()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_post_reaction()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_route_rides()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_route_saves()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_seller_rating()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_premium()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_protect_last_owner()      FROM PUBLIC, anon, authenticated;

-- Restrict admin/utility helpers to authenticated only (not anon)
REVOKE EXECUTE ON FUNCTION public.get_my_creator_profile()                 FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_creator_collab_email(uuid)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_group_ride_by_code(text)            FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_creator_profile()                 TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_creator_collab_email(uuid)           TO authenticated;
GRANT  EXECUTE ON FUNCTION public.find_group_ride_by_code(text)            TO authenticated;

-- SOS-by-token helpers are intentionally callable by anon (share links);
-- keep them but ensure grants are explicit and not via PUBLIC.
REVOKE EXECUTE ON FUNCTION public.get_sos_by_token(text)                   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_sos_pings_by_token(text, integer)    FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_sos_by_token(text)                   TO anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_sos_pings_by_token(text, integer)    TO anon, authenticated;
