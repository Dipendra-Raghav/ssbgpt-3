-- Remove OpenAI thread ID fields from profiles table since we're no longer using OpenAI Assistant API
-- These fields are no longer needed with the new GPT-4o-mini direct integration

ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS openai_thread_id_ppdt,
DROP COLUMN IF EXISTS openai_thread_id_srt,
DROP COLUMN IF EXISTS openai_thread_id_wat;
