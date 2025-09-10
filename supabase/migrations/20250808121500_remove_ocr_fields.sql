-- Remove OCR-related fields from test_responses table since we're no longer using OCR
-- The new system sends images directly to GPT-4o-mini for evaluation

ALTER TABLE public.test_responses 
DROP COLUMN IF EXISTS ocr_extracted_text;
