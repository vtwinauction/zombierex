-- Publish scheduled posts every minute via pg_cron -> pg_net -> TanStack route
DO $$
DECLARE
  v_url text := 'https://project--664b5247-6109-454c-a02d-b27b2518c88c.lovable.app/api/public/hooks/publish-scheduled';
  v_key text := 'sb_publishable_Tg5nksr4FwR6sEt1UzqXUQ_hcW7rtk7';
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'zrx-publish-scheduled-minutely';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;

  PERFORM cron.schedule(
    'zrx-publish-scheduled-minutely',
    '* * * * *',
    format($cmd$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object('apikey', %L, 'content-type', 'application/json'),
        body := '{}'::jsonb
      );
    $cmd$, v_url, v_key)
  );
END $$;