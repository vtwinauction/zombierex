CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  v_base   text := 'https://project--664b5247-6109-454c-a02d-b27b2518c88c.lovable.app/api/public/hooks/';
  v_secret text := '05cfecdfe32f0b539f35ee4c567016c5df9445a81d7752012071130a9776d9d8';
  v_jobs   text[][] := ARRAY[
    ARRAY['zrx-publish-scheduled-minutely', 'publish-scheduled', '* * * * *'],
    ARRAY['zrx-fanout-push-minutely',       'fanout-push',       '* * * * *'],
    ARRAY['zrx-cleanup-media-hourly',       'cleanup-media',     '17 * * * *'],
    ARRAY['zrx-run-payouts-daily',          'run-payouts',       '20 3 * * *']
  ];
  v_job    text[];
  v_jobid  bigint;
BEGIN
  FOREACH v_job SLICE 1 IN ARRAY v_jobs LOOP
    SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = v_job[1];
    IF v_jobid IS NOT NULL THEN
      PERFORM cron.unschedule(v_jobid);
    END IF;

    PERFORM cron.schedule(
      v_job[1],
      v_job[3],
      format($cmd$
        select net.http_post(
          url := %L,
          headers := jsonb_build_object('content-type','application/json','x-cron-secret', %L),
          body := '{}'::jsonb
        );
      $cmd$, v_base || v_job[2], v_secret)
    );
  END LOOP;
END $$;