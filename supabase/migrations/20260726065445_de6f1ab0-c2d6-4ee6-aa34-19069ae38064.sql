-- Central audit-log trigger. SECURITY DEFINER so it can insert regardless of
-- the invoking user's RLS, but locked to public schema and idempotent.
CREATE OR REPLACE FUNCTION public.tg_audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
  v_target uuid;
  v_meta jsonb;
  v_action text;
BEGIN
  v_action := TG_TABLE_NAME || '.' || lower(TG_OP);

  IF TG_OP = 'DELETE' THEN
    v_target := (to_jsonb(OLD) ->> 'id')::uuid;
    v_meta := jsonb_build_object('old', to_jsonb(OLD));
  ELSIF TG_OP = 'INSERT' THEN
    v_target := (to_jsonb(NEW) ->> 'id')::uuid;
    v_meta := jsonb_build_object('new', to_jsonb(NEW));
  ELSE
    v_target := (to_jsonb(NEW) ->> 'id')::uuid;
    -- Only record columns that actually changed
    v_meta := jsonb_build_object(
      'changed',
      (SELECT jsonb_object_agg(key, jsonb_build_object('old', o.value, 'new', n.value))
         FROM jsonb_each(to_jsonb(OLD)) o
         JOIN jsonb_each(to_jsonb(NEW)) n USING (key)
        WHERE o.value IS DISTINCT FROM n.value)
    );
  END IF;

  INSERT INTO public.audit_log (actor_id, action, target_kind, target_id, meta)
  VALUES (v_actor, v_action, TG_TABLE_NAME, v_target, COALESCE(v_meta, '{}'::jsonb));

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Never break the underlying write if audit fails
  RETURN COALESCE(NEW, OLD);
END $$;

-- Attach to sensitive tables (drop-then-create for idempotency)
DO $$
DECLARE
  t text;
  sensitive text[] := ARRAY[
    'user_roles',
    'payments',
    'orders',
    'moderation_actions',
    'owner_broadcasts',
    'sos_alerts',
    'premium_memberships',
    'subscriptions',
    'creator_subscriptions',
    'api_keys',
    'feature_flags',
    'feature_flags_v2',
    'platform_settings'
  ];
BEGIN
  FOREACH t IN ARRAY sensitive LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS zrx_audit_%1$s ON public.%1$I', t);
      EXECUTE format(
        'CREATE TRIGGER zrx_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row()',
        t
      );
    END IF;
  END LOOP;
END $$;

-- Lock down the audit function itself
REVOKE ALL ON FUNCTION public.tg_audit_row() FROM PUBLIC, anon, authenticated;