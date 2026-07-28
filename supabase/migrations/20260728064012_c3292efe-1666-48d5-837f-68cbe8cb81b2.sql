-- 1) Fix Security Definer View (ERROR)
ALTER VIEW public.profiles_public SET (security_invoker = on);

-- 2) Replace always-true INSERT policy on crash_reports
DROP POLICY IF EXISTS authed_insert_crash ON public.crash_reports;
CREATE POLICY authed_insert_crash ON public.crash_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

-- 3) Revoke EXECUTE from anon/authenticated/PUBLIC on trigger-only function
REVOKE EXECUTE ON FUNCTION public.tg_guard_profile_privileged() FROM PUBLIC, anon, authenticated;