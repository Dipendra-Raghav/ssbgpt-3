-- Update evaluations table to support new GPT-4o-mini evaluation structure
-- Remove old fields and add new structured fields

-- First, backup existing data if needed
CREATE TABLE IF NOT EXISTS evaluations_backup AS SELECT * FROM evaluations;

-- Drop the old evaluations table
DROP TABLE IF EXISTS evaluations;

-- Create new evaluations table with updated structure
CREATE TABLE public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- New structured evaluation fields
  score INTEGER CHECK (score >= 1 AND score <= 5), -- Score out of 5
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100), -- Converted to 0-100 scale
  
  -- Structured analysis fields
  analysis TEXT, -- The detailed analysis section
  improved_response TEXT, -- The improved/ideal response section
  
  -- Legacy fields for backward compatibility (can be removed later)
  olq_scores JSONB,
  strengths TEXT[],
  improvements TEXT[],
  detailed_analysis JSONB
);

-- Enable RLS
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own evaluations" 
ON public.evaluations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own evaluations" 
ON public.evaluations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own evaluations" 
ON public.evaluations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_evaluations_user_id ON evaluations(user_id);
CREATE INDEX idx_evaluations_test_type ON evaluations(test_type);
CREATE INDEX idx_evaluations_created_at ON evaluations(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_evaluations_set_updated_at
    BEFORE UPDATE ON public.evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data if needed (optional)
-- INSERT INTO evaluations (user_id, test_type, score, overall_score, analysis, improved_response) VALUES (...);
