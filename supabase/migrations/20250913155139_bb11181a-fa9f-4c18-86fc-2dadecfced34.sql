-- Enable pg_cron extension (installed in the "extensions" schema on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule daily refill at 00:00 UTC using the existing reset_daily_credits() function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'reset-daily-credits'
  ) THEN
    PERFORM cron.schedule(
      'reset-daily-credits',              -- unique job name
      '0 0 * * *',                        -- every day at 00:00 UTC
      $$ SELECT public.reset_daily_credits(); $$ -- call existing function
    );
  END IF;
END
$$;