
CREATE TABLE public.vehicle_mods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  brand text,
  notes text,
  cost_minor bigint,
  currency text NOT NULL DEFAULT 'BHD',
  installed_on date,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicle_mods_vehicle_idx ON public.vehicle_mods(vehicle_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_mods TO authenticated;
GRANT SELECT ON public.vehicle_mods TO anon;
GRANT ALL ON public.vehicle_mods TO service_role;
ALTER TABLE public.vehicle_mods ENABLE ROW LEVEL SECURITY;
CREATE POLICY vehicle_mods_public_read ON public.vehicle_mods FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.deleted_at IS NULL)
);
CREATE POLICY vehicle_mods_owner_insert ON public.vehicle_mods FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY vehicle_mods_owner_update ON public.vehicle_mods FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY vehicle_mods_owner_delete ON public.vehicle_mods FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER vehicle_mods_updated_at BEFORE UPDATE ON public.vehicle_mods FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.vehicle_service_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  title text NOT NULL,
  shop text,
  notes text,
  odometer_km integer,
  cost_minor bigint,
  currency text NOT NULL DEFAULT 'BHD',
  service_date date NOT NULL DEFAULT current_date,
  due_date date,
  status text NOT NULL DEFAULT 'done',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicle_service_vehicle_idx ON public.vehicle_service_records(vehicle_id, service_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_service_records TO authenticated;
GRANT ALL ON public.vehicle_service_records TO service_role;
ALTER TABLE public.vehicle_service_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY vehicle_service_owner_all ON public.vehicle_service_records FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE TRIGGER vehicle_service_updated_at BEFORE UPDATE ON public.vehicle_service_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
