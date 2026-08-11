-- 1. Split contact PII out of profiles
CREATE TABLE public.profile_contacts (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_phone text,
  contact_email text,
  business_address text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_contacts TO authenticated;
GRANT SELECT ON public.profile_contacts TO anon;
GRANT ALL ON public.profile_contacts TO service_role;

ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;

INSERT INTO public.profile_contacts (profile_id, contact_phone, contact_email, business_address)
SELECT id, contact_phone, contact_email, business_address
FROM public.profiles
WHERE contact_phone IS NOT NULL OR contact_email IS NOT NULL OR business_address IS NOT NULL;

CREATE POLICY "Owner reads own contacts" ON public.profile_contacts
  FOR SELECT TO authenticated USING (profile_id = auth.uid() OR public.is_owner(auth.uid()));

CREATE POLICY "Business contacts are public" ON public.profile_contacts
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND COALESCE(p.is_business,false) = true
      AND COALESCE(p.is_private,false) = false AND p.deleted_at IS NULL
  ));

CREATE POLICY "Owner writes own contacts" ON public.profile_contacts
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Owner updates own contacts" ON public.profile_contacts
  FOR UPDATE TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Owner deletes own contacts" ON public.profile_contacts
  FOR DELETE TO authenticated USING (profile_id = auth.uid());

ALTER TABLE public.profiles
  DROP COLUMN contact_phone,
  DROP COLUMN contact_email,
  DROP COLUMN business_address;

-- 2. Stop leaking advertiser budgets/targeting publicly
DROP POLICY IF EXISTS "Public read via safe view" ON public.ad_campaigns;

CREATE POLICY "Public read active campaigns" ON public.ad_campaigns
  FOR SELECT TO anon USING (status = 'active'::ad_status);

REVOKE SELECT ON public.ad_campaigns FROM anon;
GRANT SELECT (id, name, status, objective, placements, owner_id, vendor_id, created_at)
  ON public.ad_campaigns TO anon;