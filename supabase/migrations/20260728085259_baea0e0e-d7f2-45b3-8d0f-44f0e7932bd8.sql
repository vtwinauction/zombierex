CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'zrx-cleanup-media-hourly') THEN
    PERFORM cron.unschedule('zrx-cleanup-media-hourly');
  END IF;
END $$;

SELECT cron.schedule(
  'zrx-cleanup-media-hourly',
  '17 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--664b5247-6109-454c-a02d-b27b2518c88c.lovable.app/api/public/hooks/cleanup-media',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_Tg5nksr4FwR6sEt1UzqXUQ_hcW7rtk7"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);