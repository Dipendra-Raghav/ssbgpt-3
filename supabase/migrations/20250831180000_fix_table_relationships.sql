-- Fix table relationships for test_responses
-- This migration adds proper foreign key constraints to link test_responses with test content

-- Add foreign key constraints for test_responses.image_id
-- The image_id field references different tables based on test_type

-- First, let's add a check constraint to ensure test_type is valid
ALTER TABLE public.test_responses 
ADD CONSTRAINT check_test_type 
CHECK (test_type IN ('ppdt', 'wat', 'srt'));

-- Create a function to validate image_id based on test_type
CREATE OR REPLACE FUNCTION validate_image_id()
RETURNS TRIGGER AS $$
BEGIN
  -- For PPDT tests, image_id should reference ppdt_images
  IF NEW.test_type = 'ppdt' AND NEW.image_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.ppdt_images WHERE id = NEW.image_id) THEN
      RAISE EXCEPTION 'Invalid image_id for PPDT test: % does not exist in ppdt_images', NEW.image_id;
    END IF;
  END IF;
  
  -- For WAT tests, image_id should reference wat_words
  IF NEW.test_type = 'wat' AND NEW.image_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.wat_words WHERE id = NEW.image_id) THEN
      RAISE EXCEPTION 'Invalid image_id for WAT test: % does not exist in wat_words', NEW.image_id;
    END IF;
  END IF;
  
  -- For SRT tests, image_id should reference srt_situations
  IF NEW.test_type = 'srt' AND NEW.image_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.srt_situations WHERE id = NEW.image_id) THEN
      RAISE EXCEPTION 'Invalid image_id for SRT test: % does not exist in srt_situations', NEW.image_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate image_id before insert/update
CREATE TRIGGER validate_image_id_trigger
  BEFORE INSERT OR UPDATE ON public.test_responses
  FOR EACH ROW
  EXECUTE FUNCTION validate_image_id();

-- Add indexes for better performance on joins
CREATE INDEX IF NOT EXISTS idx_test_responses_image_id ON public.test_responses(image_id);
CREATE INDEX IF NOT EXISTS idx_test_responses_test_type ON public.test_responses(test_type);
CREATE INDEX IF NOT EXISTS idx_test_responses_session_id ON public.test_responses(session_id);

-- Add indexes on the referenced tables
CREATE INDEX IF NOT EXISTS idx_wat_words_id ON public.wat_words(id);
CREATE INDEX IF NOT EXISTS idx_srt_situations_id ON public.srt_situations(id);
CREATE INDEX IF NOT EXISTS idx_ppdt_images_id ON public.ppdt_images(id);

-- Update the storage bucket to be public (if not already)
UPDATE storage.buckets SET public = true WHERE id = 'test-responses';

-- Ensure all tables have proper RLS policies
-- (These should already exist, but let's make sure)

-- Enable RLS on all test content tables if not already enabled
ALTER TABLE public.wat_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.srt_situations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppdt_images ENABLE ROW LEVEL SECURITY;

-- Create or update policies for test content tables
-- These tables should be publicly readable for the evaluation function

-- WAT words policy (public read access)
DROP POLICY IF EXISTS "Anyone can view WAT words" ON public.wat_words;
CREATE POLICY "Anyone can view WAT words" 
ON public.wat_words 
FOR SELECT 
USING (true);

-- SRT situations policy (public read access)
DROP POLICY IF EXISTS "Anyone can view SRT situations" ON public.srt_situations;
CREATE POLICY "Anyone can view SRT situations" 
ON public.srt_situations 
FOR SELECT 
USING (true);

-- PPDT images policy (public read access)
DROP POLICY IF EXISTS "Anyone can view PPDT images" ON public.ppdt_images;
CREATE POLICY "Anyone can view PPDT images" 
ON public.ppdt_images 
FOR SELECT 
USING (true);

-- Add comments to clarify the relationships
COMMENT ON COLUMN public.test_responses.image_id IS 'References ppdt_images.id for PPDT tests, wat_words.id for WAT tests, or srt_situations.id for SRT tests';
COMMENT ON COLUMN public.test_responses.test_type IS 'Type of test: ppdt, wat, or srt';
COMMENT ON TABLE public.test_responses IS 'Stores user responses to different test types with references to test content';
