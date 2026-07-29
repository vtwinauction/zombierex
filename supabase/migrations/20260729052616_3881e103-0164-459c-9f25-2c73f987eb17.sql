GRANT SELECT ON public.feature_flags_v2 TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags_v2 TO authenticated;
GRANT ALL ON public.feature_flags_v2 TO service_role;

GRANT SELECT ON public.maintenance_state TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_state TO authenticated;
GRANT ALL ON public.maintenance_state TO service_role;

GRANT SELECT ON public.module_maintenance TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_maintenance TO authenticated;
GRANT ALL ON public.module_maintenance TO service_role;

INSERT INTO public.maintenance_state (id, global_enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;