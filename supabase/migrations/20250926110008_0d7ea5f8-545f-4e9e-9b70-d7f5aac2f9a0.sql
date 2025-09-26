-- Update the database function to initialize new users with correct credit amounts
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, wat_credits, srt_credits, ppdt_credits)
  VALUES (NEW.user_id, 10, 10, 2)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;