-- Add missing columns to evaluations table for new evaluation structure
-- This migration adds the columns that the openai-evaluation function expects

-- Add the missing columns to your existing evaluations table
ALTER TABLE public.evaluations 
ADD COLUMN IF NOT EXISTS score INTEGER CHECK (score >= 1 AND score <= 5),
ADD COLUMN IF NOT EXISTS overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
ADD COLUMN IF NOT EXISTS analysis TEXT,
ADD COLUMN IF NOT EXISTS improved_response TEXT;

-- Update storage bucket to public for easier image access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'test-responses';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_test_type ON evaluations(test_type);
CREATE INDEX IF NOT EXISTS idx_test_responses_user_test ON test_responses(user_id, test_type);

-- Create user_streaks table for streak tracking
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_streaks
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- Create policies for user_streaks
CREATE POLICY "Users can view their own streaks" 
ON public.user_streaks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks" 
ON public.user_streaks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks" 
ON public.user_streaks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at on user_streaks
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_user_streaks_set_updated_at
    BEFORE UPDATE ON public.user_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
