-- Initialize credits for existing users who don't have credits yet
INSERT INTO public.user_credits (user_id, wat_credits, srt_credits, ppdt_credits, has_unlimited)
SELECT 
  p.user_id,
  5 as wat_credits,
  5 as srt_credits, 
  3 as ppdt_credits,
  false as has_unlimited
FROM public.profiles p
LEFT JOIN public.user_credits uc ON p.user_id = uc.user_id
WHERE uc.user_id IS NULL;