-- Update all existing user credits to the new system
UPDATE user_credits 
SET 
  wat_credits = 10,
  srt_credits = 10, 
  ppdt_credits = 2,
  last_daily_reset = NULL
WHERE wat_credits = 5 AND srt_credits = 5 AND ppdt_credits = 3;