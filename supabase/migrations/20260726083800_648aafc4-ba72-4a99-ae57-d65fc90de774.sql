
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  bucket TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_events_user_bucket_time_idx
  ON public.rate_limit_events (user_id, bucket, created_at DESC);

GRANT ALL ON public.rate_limit_events TO service_role;
-- No grants to authenticated/anon; access is only via SECURITY DEFINER function.

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
-- No policies: with RLS on and zero policies, non-service_role roles cannot read/write.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _bucket TEXT,
  _max_hits INT,
  _window_seconds INT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _count INT;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  -- Opportunistic cleanup of stale rows for this user+bucket to keep table small.
  DELETE FROM public.rate_limit_events
   WHERE user_id = _uid
     AND bucket = _bucket
     AND created_at < now() - make_interval(secs => _window_seconds);

  SELECT count(*) INTO _count
    FROM public.rate_limit_events
   WHERE user_id = _uid
     AND bucket = _bucket
     AND created_at >= now() - make_interval(secs => _window_seconds);

  IF _count >= _max_hits THEN
    RAISE EXCEPTION 'rate_limit_exceeded: % (% per %s)', _bucket, _max_hits, _window_seconds
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.rate_limit_events(user_id, bucket) VALUES (_uid, _bucket);
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO authenticated, service_role;
