-- Enable pg_cron extension in extensions schema
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage permissions
GRANT USAGE ON SCHEMA extensions TO postgres;

-- Schedule daily refill at 00:00 UTC using the existing reset_daily_credits() function
SELECT extensions.cron_schedule(
  'reset-daily-credits',              -- unique job name
  '0 0 * * *',                        -- every day at 00:00 UTC
  'SELECT public.reset_daily_credits();' -- call existing function
);