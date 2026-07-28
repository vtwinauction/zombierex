-- Trigger-only functions: no client should ever call these directly
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN SELECT unnest(ARRAY[
    'public.apply_xp_event()',
    'public.bump_ad_campaign_counters()',
    'public.bump_challenge_entries()',
    'public.bump_challenge_entry_votes()',
    'public.bump_creator_subscribers()',
    'public.bump_creator_tips_total()',
    'public.bump_event_counts()',
    'public.bump_follow_counts()',
    'public.bump_listing_photos_count()',
    'public.bump_listing_saves()',
    'public.bump_listings_count()',
    'public.bump_post_reaction()',
    'public.bump_route_rides()',
    'public.bump_route_saves()',
    'public.handle_new_user()',
    'public.refresh_seller_rating()',
    'public.sync_profile_premium()',
    'public.tg_audit_row()',
    'public.tg_guard_profile_privileged()',
    'public.tg_protect_last_owner()'
  ]) LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- RLS-helper functions: keep callable ONLY by authenticated (needed inside policies), revoke anon + public
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN SELECT unnest(ARRAY[
    'public.can_view_event(uuid, uuid)',
    'public.is_club_member(uuid, uuid)',
    'public.is_club_staff(uuid, uuid)',
    'public.is_conversation_member(uuid, uuid)',
    'public.is_drag_match_participant(uuid, uuid)',
    'public.is_group_ride_member(uuid, uuid)',
    'public.user_has_event_invite(uuid, uuid)',
    'public.user_has_event_rsvp(uuid, uuid)',
    'public.get_creator_collab_email(uuid)',
    'public.get_my_creator_profile()'
  ]) LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;