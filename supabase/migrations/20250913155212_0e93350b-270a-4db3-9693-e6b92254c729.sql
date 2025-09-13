-- Schedule daily refill at 00:00 UTC using the existing reset_daily_credits() function
SELECT cron.schedule(
  'reset-daily-credits',              -- unique job name
  '0 0 * * *',                        -- every day at 00:00 UTC
  'SELECT public.reset_daily_credits();' -- call existing function
);