DROP POLICY IF EXISTS "Business contacts are public" ON public.profile_contacts;

CREATE POLICY "Business contacts visible to members"
ON public.profile_contacts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_contacts.profile_id
      AND COALESCE(p.is_business, false) = true
      AND COALESCE(p.is_private, false) = false
      AND COALESCE(p.contact_dm_enabled, false) = true
      AND p.deleted_at IS NULL
  )
);

REVOKE SELECT ON public.profile_contacts FROM anon;