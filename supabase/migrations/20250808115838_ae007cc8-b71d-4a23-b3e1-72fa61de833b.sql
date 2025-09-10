
-- 1) Deduplicate piq_forms so we can safely add a unique constraint on user_id
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.piq_forms
)
DELETE FROM public.piq_forms p
USING ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- 2) Add a unique constraint on user_id to support upsert(... onConflict: 'user_id')
ALTER TABLE public.piq_forms
ADD CONSTRAINT piq_forms_user_id_unique UNIQUE (user_id);

-- 3) Ensure updated_at auto-updates on edits (uses existing function public.update_updated_at_column)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_piq_forms_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_piq_forms_set_updated_at
    BEFORE UPDATE ON public.piq_forms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;
