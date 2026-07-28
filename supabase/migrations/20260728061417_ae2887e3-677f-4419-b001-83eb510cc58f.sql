-- =========================================================================
-- PHASE A · Audit remediation: C-04, C-05, C-06, C-07, M-07, H-04
-- =========================================================================

-- ---------- C-04 · Close anonymous PII read on profiles ------------------

REVOKE SELECT ON public.profiles FROM anon;

DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;

CREATE POLICY "profiles_authed_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      COALESCE(is_private, false) = false
      OR id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.followee_id = profiles.id
          AND f.follower_id = (select auth.uid())
      )
    )
  );

-- Public projection: PII-free, honours privacy + suspension flags
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = off) AS
  SELECT id, handle, display_name, bio, avatar_url, cover_url,
         tier, is_verified, is_business, followers_count, posts_count,
         created_at
  FROM public.profiles
  WHERE deleted_at IS NULL
    AND COALESCE(is_private, false) = false
    AND COALESCE(is_suspended, false) = false;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- ---------- C-05 · Column-level UPDATE grants on profiles ----------------

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  handle, display_name, bio, avatar_url, cover_url,
  location, website, contact_phone, contact_email,
  contact_dm_enabled, is_business, business_address,
  is_private, allow_messages, profile_theme,
  featured_badge_slug, deleted_at, updated_at
) ON public.profiles TO authenticated;

-- Defence-in-depth: revert any attempt to touch privileged columns
CREATE OR REPLACE FUNCTION public.tg_guard_profile_privileged()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_any_role((select auth.uid()), ARRAY['admin','super_admin','owner']::app_role[]) THEN
    RETURN NEW;
  END IF;
  NEW.is_verified          := OLD.is_verified;
  NEW.verified_at          := OLD.verified_at;
  NEW.verified_by          := OLD.verified_by;
  NEW.is_suspended         := OLD.is_suspended;
  NEW.suspended_reason     := OLD.suspended_reason;
  NEW.suspended_at         := OLD.suspended_at;
  NEW.suspended_by         := OLD.suspended_by;
  NEW.is_premium           := OLD.is_premium;
  NEW.tier                 := OLD.tier;
  NEW.xp_total             := OLD.xp_total;
  NEW.level                := OLD.level;
  NEW.streak_days          := OLD.streak_days;
  NEW.last_checkin_at      := OLD.last_checkin_at;
  NEW.followers_count      := OLD.followers_count;
  NEW.following_count      := OLD.following_count;
  NEW.posts_count          := OLD.posts_count;
  NEW.listings_count       := OLD.listings_count;
  NEW.seller_rating_avg    := OLD.seller_rating_avg;
  NEW.seller_reviews_count := OLD.seller_reviews_count;
  NEW.referral_code        := OLD.referral_code;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_guard_privileged ON public.profiles;
CREATE TRIGGER profiles_guard_privileged
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_profile_privileged();

-- ---------- C-06 · Vendors: no self-verification -----------------------

REVOKE UPDATE ON public.vendors FROM authenticated;
GRANT UPDATE (
  business_name, description, logo_url, cover_url, website,
  address_line1, address_line2, city, region, country, postal_code, lat, lng,
  socials, operating_hours, service_areas, contact_channels,
  phone, email, owner_name,
  gallery, portfolio, services_showcase, products_showcase,
  updated_at
) ON public.vendors TO authenticated;

-- ---------- C-07 · Premium: entitlement is server-owned ------------------

REVOKE INSERT, UPDATE ON public.premium_memberships FROM authenticated;
DROP POLICY IF EXISTS "pm_own_update" ON public.premium_memberships;

-- Remove dead policy so a future GRANT cannot silently open the hole
DROP POLICY IF EXISTS "subs_owner_update" ON public.subscriptions;

-- ---------- M-07 · Restrict anonymous inserts ---------------------------

DROP POLICY IF EXISTS "anyone_insert_crash" ON public.crash_reports;
CREATE POLICY "authed_insert_crash" ON public.crash_reports
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_insert" ON public.analytics_events;
CREATE POLICY "analytics_authed_insert" ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = (select auth.uid()));

-- ---------- H-04 · Foreign-key indexes (hot path) -----------------------

CREATE INDEX IF NOT EXISTS idx_messages_sender          ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_comments_author          ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent          ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor      ON public.notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_user        ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user            ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order           ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription    ON public.payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order        ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product      ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_listing       ON public.cart_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user        ON public.club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user         ON public.event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_group_ride_members_user  ON public.group_ride_members(user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked      ON public.user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muted         ON public.user_mutes(muted_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag    ON public.post_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_posts_vehicle            ON public.posts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_created     ON public.posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_id         ON public.posts(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower         ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followee         ON public.follows(followee_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post           ON public.reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user           ON public.reactions(user_id);