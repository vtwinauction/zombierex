-- 1) New booking statuses
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'awaiting_garage';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'quotation_sent';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'awaiting_customer';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'checked_in';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'waiting_parts';

-- 2) Garage/workshop business fields
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS specialties text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brands text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vehicle_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS emergency_service boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS response_time_mins integer,
  ADD COLUMN IF NOT EXISTS completed_jobs_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_from_cents integer,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BHD',
  ADD COLUMN IF NOT EXISTS certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS team jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS policies jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_methods text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS booking_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS availability jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rating_avg numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS vendors_geo_idx ON public.vendors (lat, lng);
CREATE INDEX IF NOT EXISTS vendors_specialties_idx ON public.vendors USING gin (specialties);
CREATE INDEX IF NOT EXISTS vendors_brands_idx ON public.vendors USING gin (brands);

-- keep aggregate rating in sync
CREATE OR REPLACE FUNCTION public.refresh_vendor_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE vid uuid;
BEGIN
  vid := COALESCE(NEW.vendor_id, OLD.vendor_id);
  UPDATE public.vendors v
     SET rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.business_reviews WHERE vendor_id = vid), 0),
         reviews_count = COALESCE((SELECT COUNT(*) FROM public.business_reviews WHERE vendor_id = vid), 0)
   WHERE v.id = vid;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_refresh_vendor_rating ON public.business_reviews;
CREATE TRIGGER trg_refresh_vendor_rating
AFTER INSERT OR UPDATE OR DELETE ON public.business_reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_vendor_rating();

UPDATE public.vendors v SET
  rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric,2) FROM public.business_reviews r WHERE r.vendor_id = v.id), 0),
  reviews_count = COALESCE((SELECT COUNT(*) FROM public.business_reviews r WHERE r.vendor_id = v.id), 0);

-- 3) Booking workflow fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS problem_text text,
  ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_media jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quote_cents integer,
  ADD COLUMN IF NOT EXISTS quote_notes text,
  ADD COLUMN IF NOT EXISTS quote_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BHD',
  ADD COLUMN IF NOT EXISTS status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_reason text;

CREATE INDEX IF NOT EXISTS bookings_vendor_status_idx ON public.bookings (vendor_id, status, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS bookings_customer_idx ON public.bookings (customer_id, created_at DESC);

-- 4) Subscription plan management fields
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

DROP POLICY IF EXISTS plans_admin_manage ON public.subscription_plans;
CREATE POLICY plans_admin_manage ON public.subscription_plans
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','owner']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','owner']::app_role[]));

-- 5) Public vendor view refreshed with the new business fields
DROP VIEW IF EXISTS public.vendors_public;
CREATE VIEW public.vendors_public
WITH (security_invoker = true) AS
SELECT id, slug, business_name, description, business_type, logo_url, cover_url, gallery,
       portfolio, services_showcase, products_showcase, contact_channels,
       website, phone, email, socials, operating_hours, service_areas,
       address_line1, city, region, country, lat, lng,
       is_verified, is_premium, premium_until,
       specialties, brands, vehicle_types, emergency_service, response_time_mins,
       completed_jobs_count, price_from_cents, currency, certifications, team, policies,
       payment_methods, booking_enabled, availability, rating_avg, reviews_count,
       followers_count, profile_views_count, created_at
FROM public.vendors
WHERE verification_status = 'approved' OR is_verified = true;

GRANT SELECT ON public.vendors_public TO anon, authenticated;
GRANT SELECT ON public.services TO anon, authenticated;
GRANT SELECT ON public.business_reviews TO anon, authenticated;
GRANT SELECT ON public.subscription_plans TO anon, authenticated;

-- 6) Nearby garage search
CREATE OR REPLACE FUNCTION public.garage_search(
  _lat double precision DEFAULT NULL,
  _lng double precision DEFAULT NULL,
  _q text DEFAULT NULL,
  _specialties text[] DEFAULT NULL,
  _vehicle_type text DEFAULT NULL,
  _brand text DEFAULT NULL,
  _emergency boolean DEFAULT NULL,
  _limit integer DEFAULT 40
)
RETURNS TABLE (
  id uuid, slug text, business_name text, business_type text, description text,
  logo_url text, cover_url text, city text, country text,
  lat double precision, lng double precision,
  is_verified boolean, is_premium boolean, emergency_service boolean,
  specialties text[], brands text[], vehicle_types text[],
  rating_avg numeric, reviews_count integer, price_from_cents integer, currency text,
  operating_hours jsonb, response_time_mins integer, completed_jobs_count integer,
  distance_km double precision, services_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH base AS (
    SELECT v.*,
      CASE WHEN _lat IS NULL OR _lng IS NULL OR v.lat IS NULL OR v.lng IS NULL THEN NULL
        ELSE 6371 * 2 * asin(sqrt(
          power(sin(radians(v.lat - _lat) / 2), 2) +
          cos(radians(_lat)) * cos(radians(v.lat)) *
          power(sin(radians(v.lng - _lng) / 2), 2)))
      END AS dist_km
    FROM public.vendors v
    WHERE (v.verification_status = 'approved' OR v.is_verified = true)
      AND v.booking_enabled = true
      AND (_emergency IS NULL OR v.emergency_service = _emergency)
      AND (_specialties IS NULL OR array_length(_specialties, 1) IS NULL OR v.specialties && _specialties)
      AND (_vehicle_type IS NULL OR v.vehicle_types = '{}' OR _vehicle_type = ANY(v.vehicle_types))
      AND (_brand IS NULL OR EXISTS (SELECT 1 FROM unnest(v.brands) b WHERE b ILIKE '%' || _brand || '%'))
      AND (
        _q IS NULL OR _q = '' OR
        v.business_name ILIKE '%' || _q || '%' OR
        COALESCE(v.description,'') ILIKE '%' || _q || '%' OR
        COALESCE(v.city,'') ILIKE '%' || _q || '%' OR
        EXISTS (SELECT 1 FROM unnest(v.brands) b WHERE b ILIKE '%' || _q || '%') OR
        EXISTS (SELECT 1 FROM unnest(v.specialties) s WHERE s ILIKE '%' || _q || '%') OR
        EXISTS (SELECT 1 FROM public.services sv WHERE sv.vendor_id = v.id AND sv.is_active AND sv.name ILIKE '%' || _q || '%')
      )
  )
  SELECT b.id, b.slug, b.business_name, b.business_type, b.description,
         b.logo_url, b.cover_url, b.city, b.country, b.lat, b.lng,
         b.is_verified, b.is_premium, b.emergency_service,
         b.specialties, b.brands, b.vehicle_types,
         b.rating_avg, b.reviews_count, b.price_from_cents, b.currency,
         b.operating_hours, b.response_time_mins, b.completed_jobs_count,
         b.dist_km AS distance_km,
         (SELECT count(*) FROM public.services sv WHERE sv.vendor_id = b.id AND sv.is_active) AS services_count
  FROM base b
  ORDER BY
    (b.is_premium AND b.dist_km IS NOT NULL AND b.dist_km < 25) DESC,
    b.dist_km ASC NULLS LAST,
    b.is_verified DESC,
    b.rating_avg DESC,
    b.business_name ASC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 40), 1), 100)
$$;

REVOKE ALL ON FUNCTION public.garage_search(double precision, double precision, text, text[], text, text, boolean, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.garage_search(double precision, double precision, text, text[], text, text, boolean, integer) TO anon, authenticated, service_role;