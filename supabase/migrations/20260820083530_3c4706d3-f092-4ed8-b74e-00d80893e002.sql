ALTER TABLE public.vehicle_service_records
  ADD COLUMN IF NOT EXISTS due_odometer_km integer;