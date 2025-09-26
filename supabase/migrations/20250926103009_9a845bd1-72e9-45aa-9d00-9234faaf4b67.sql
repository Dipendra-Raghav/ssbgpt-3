-- Remove daily credit reset functionality since we no longer provide daily free credits

-- Drop the existing reset_daily_credits function as it's no longer needed
DROP FUNCTION IF EXISTS public.reset_daily_credits();

-- Update user_credits to remove daily reset tracking and update initial credits for existing users
-- Set new initial credits: WAT: 10, SRT: 10, PPDT: 2 (for users who haven't used the new system)
UPDATE public.user_credits 
SET 
  wat_credits = CASE 
    WHEN wat_credits <= 5 AND srt_credits <= 5 AND ppdt_credits <= 3 THEN 10
    ELSE wat_credits 
  END,
  srt_credits = CASE 
    WHEN wat_credits <= 5 AND srt_credits <= 5 AND ppdt_credits <= 3 THEN 10  
    ELSE srt_credits
  END,
  ppdt_credits = CASE 
    WHEN wat_credits <= 5 AND srt_credits <= 5 AND ppdt_credits <= 3 THEN 2
    ELSE ppdt_credits 
  END,
  last_daily_reset = NULL,  -- Remove daily reset tracking
  updated_at = now()
WHERE has_unlimited = FALSE;