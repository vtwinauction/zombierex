
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS notifications_pending_push_idx
  ON public.notifications (created_at)
  WHERE pushed_at IS NULL;

-- Ensure extensions are on (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior version of this job before rescheduling
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'zrx-fanout-push-minutely') THEN
    PERFORM cron.unschedule('zrx-fanout-push-minutely');
  END IF;
END $$;

SELECT cron.schedule(
  'zrx-fanout-push-minutely',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--664b5247-6109-454c-a02d-b27b2518c88c.lovable.app/api/public/hooks/fanout-push',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_Tg5nksr4FwR6sEt1UzqXUQ_hcW7rtk7"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
