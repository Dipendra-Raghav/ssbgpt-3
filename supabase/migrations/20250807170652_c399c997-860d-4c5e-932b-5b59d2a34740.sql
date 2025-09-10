-- Add OpenAI Assistant thread management columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN openai_thread_id_ppdt TEXT,
ADD COLUMN openai_thread_id_srt TEXT,
ADD COLUMN openai_thread_id_wat TEXT;

-- Add OCR extracted text column to test_responses table
ALTER TABLE public.test_responses 
ADD COLUMN ocr_extracted_text TEXT;