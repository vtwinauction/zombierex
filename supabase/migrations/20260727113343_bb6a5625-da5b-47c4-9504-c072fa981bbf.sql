
-- Switch role-check helpers to SECURITY INVOKER; user_roles already grants SELECT to authenticated,
-- and every call site passes auth.uid(), so the caller's RLS returns the row.
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
ALTER FUNCTION public.has_any_role(uuid, public.app_role[]) SECURITY INVOKER;
ALTER FUNCTION public.is_owner(uuid) SECURITY INVOKER;

-- Revoke anon EXECUTE where anon has no legitimate path to trigger the helper.
REVOKE EXECUTE ON FUNCTION public.is_club_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_club_staff(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_owner(uuid) FROM anon;

-- These were granted to PUBLIC (=X/postgres). Lock to authenticated only.
REVOKE EXECUTE ON FUNCTION public.user_has_event_invite(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_event_rsvp(uuid, uuid) FROM PUBLIC, anon;
