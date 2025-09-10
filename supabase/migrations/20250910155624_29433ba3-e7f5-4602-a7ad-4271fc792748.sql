-- Update the reset_daily_credits function to implement proper daily refill logic
-- Only WAT and SRT get daily refill of 1 credit (not accumulative)
-- PPDT does not get daily refill
DROP FUNCTION IF EXISTS public.reset_daily_credits();

CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_credits 
  SET 
    -- For WAT and SRT: If user has 0 credits and it's a new day, give 1 credit
    -- If they already have credits, don't add more (no accumulation)
    wat_credits = CASE 
      WHEN has_unlimited THEN wat_credits 
      WHEN wat_credits = 0 AND (last_daily_reset IS NULL OR last_daily_reset < CURRENT_DATE) THEN 1
      ELSE wat_credits 
    END,
    srt_credits = CASE 
      WHEN has_unlimited THEN srt_credits 
      WHEN srt_credits = 0 AND (last_daily_reset IS NULL OR last_daily_reset < CURRENT_DATE) THEN 1
      ELSE srt_credits 
    END,
    -- PPDT credits are not refilled daily
    last_daily_reset = CURRENT_DATE,
    updated_at = now()
  WHERE 
    has_unlimited = FALSE 
    AND (last_daily_reset IS NULL OR last_daily_reset < CURRENT_DATE);
END;
$$;