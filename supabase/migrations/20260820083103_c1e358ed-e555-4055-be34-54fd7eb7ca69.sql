ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS rides_vehicle_id_idx ON public.rides(vehicle_id);
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS odometer_km numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bump_vehicle_odometer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_v uuid;
  new_v uuid;
  old_d numeric := 0;
  new_d numeric := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_v := NEW.vehicle_id; new_d := COALESCE(NEW.distance_m,0);
  ELSIF TG_OP = 'DELETE' THEN
    old_v := OLD.vehicle_id; old_d := COALESCE(OLD.distance_m,0);
  ELSE
    old_v := OLD.vehicle_id; old_d := COALESCE(OLD.distance_m,0);
    new_v := NEW.vehicle_id; new_d := COALESCE(NEW.distance_m,0);
  END IF;

  IF old_v IS NOT NULL THEN
    UPDATE public.vehicles SET odometer_km = GREATEST(0, odometer_km - (old_d/1000.0)) WHERE id = old_v;
  END IF;
  IF new_v IS NOT NULL THEN
    UPDATE public.vehicles SET odometer_km = odometer_km + (new_d/1000.0) WHERE id = new_v;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS rides_bump_vehicle_odometer ON public.rides;
CREATE TRIGGER rides_bump_vehicle_odometer
AFTER INSERT OR DELETE OR UPDATE OF vehicle_id, distance_m ON public.rides
FOR EACH ROW EXECUTE FUNCTION public.bump_vehicle_odometer();