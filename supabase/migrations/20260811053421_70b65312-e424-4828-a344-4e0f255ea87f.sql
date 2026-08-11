-- creator_profiles: hide collab_email from everyone but the owner (via get_my_creator_profile)
REVOKE SELECT ON public.creator_profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, category, tagline, portfolio_url, featured_post_ids, social_links,
  accepts_collabs, status, is_verified, is_featured, subscribers_count, tips_total_cents,
  approved_at, created_at, updated_at) ON public.creator_profiles TO anon, authenticated;
GRANT ALL ON public.creator_profiles TO service_role;

-- events: hide host contact columns from public/table reads
REVOKE SELECT ON public.events FROM anon, authenticated;
GRANT SELECT (id, host_id, club_id, title, description, cover_url, location, starts_at, ends_at,
  rsvp_count, created_at, updated_at, event_type, guest_limit, gps_lat, gps_lng, category,
  visibility, status, max_attendees, address, timezone, hashtags, rules, cover_video_url,
  is_featured, comments_count, photos_count, cancelled_at) ON public.events TO anon, authenticated;
GRANT ALL ON public.events TO service_role;

CREATE OR REPLACE FUNCTION public.get_event_contact(_event_id uuid)
RETURNS TABLE(contact_email text, contact_phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.contact_email, e.contact_phone
  FROM public.events e
  WHERE e.id = _event_id
    AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()))
$$;

REVOKE ALL ON FUNCTION public.get_event_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_contact(uuid) TO authenticated, service_role;