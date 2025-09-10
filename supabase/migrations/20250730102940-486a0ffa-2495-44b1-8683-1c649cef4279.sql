-- Create comprehensive database schema for SSBGPT

-- Enable RLS on auth.users (should already be enabled)
-- ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create PIQ forms table
CREATE TABLE public.piq_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personal_info JSONB NOT NULL DEFAULT '{}',
  educational_background JSONB NOT NULL DEFAULT '{}',
  career_motivation JSONB NOT NULL DEFAULT '{}',
  achievements JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on piq_forms
ALTER TABLE public.piq_forms ENABLE ROW LEVEL SECURITY;

-- Create policies for piq_forms
CREATE POLICY "Users can view their own PIQ forms" 
ON public.piq_forms 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own PIQ forms" 
ON public.piq_forms 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PIQ forms" 
ON public.piq_forms 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create PPDT images table
CREATE TABLE public.ppdt_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  description TEXT,
  difficulty_level TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ppdt_images (public read access)
ALTER TABLE public.ppdt_images ENABLE ROW LEVEL SECURITY;

-- Create policy for ppdt_images (everyone can read)
CREATE POLICY "Anyone can view PPDT images" 
ON public.ppdt_images 
FOR SELECT 
USING (true);

-- Create SRT situations table
CREATE TABLE public.srt_situations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  situation_text TEXT NOT NULL,
  difficulty_level TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on srt_situations (public read access)
ALTER TABLE public.srt_situations ENABLE ROW LEVEL SECURITY;

-- Create policy for srt_situations (everyone can read)
CREATE POLICY "Anyone can view SRT situations" 
ON public.srt_situations 
FOR SELECT 
USING (true);

-- Create WAT words table
CREATE TABLE public.wat_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  difficulty_level TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on wat_words (public read access)
ALTER TABLE public.wat_words ENABLE ROW LEVEL SECURITY;

-- Create policy for wat_words (everyone can read)
CREATE POLICY "Anyone can view WAT words" 
ON public.wat_words 
FOR SELECT 
USING (true);

-- Create test responses table
CREATE TABLE public.test_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL, -- 'ppdt', 'srt', 'wat'
  response_text TEXT,
  response_image_url TEXT, -- for uploaded images
  image_id UUID, -- reference to ppdt_images, srt_situations, or wat_words
  time_taken INTEGER, -- in seconds
  session_id UUID, -- to group responses from same test session
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on test_responses
ALTER TABLE public.test_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for test_responses
CREATE POLICY "Users can view their own test responses" 
ON public.test_responses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own test responses" 
ON public.test_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create evaluations table
CREATE TABLE public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  session_id UUID, -- to group evaluations from same test session
  overall_score INTEGER,
  detailed_analysis JSONB,
  strengths TEXT[],
  improvements TEXT[],
  olq_scores JSONB, -- OLQ breakdown scores
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on evaluations
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Create policies for evaluations
CREATE POLICY "Users can view their own evaluations" 
ON public.evaluations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own evaluations" 
ON public.evaluations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('test-responses', 'test-responses', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create storage policies for test response uploads
CREATE POLICY "Users can upload their own test responses" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'test-responses' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own test response uploads" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'test-responses' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own test response uploads" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'test-responses' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own test response uploads" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'test-responses' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_piq_forms_updated_at
  BEFORE UPDATE ON public.piq_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for PPDT images
INSERT INTO public.ppdt_images (url, description, difficulty_level) VALUES
('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=400&fit=crop', 'Mountain landscape with hikers', 'easy'),
('https://images.unsplash.com/photo-1557804506-669a67965ba0?w=500&h=400&fit=crop', 'Diverse business team meeting', 'medium'),
('https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=500&h=400&fit=crop', 'Person helping another climb', 'medium'),
('https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=500&h=400&fit=crop', 'Students studying together', 'easy'),
('https://images.unsplash.com/photo-1573164713988-8665fc963095?w=500&h=400&fit=crop', 'Person making difficult decision', 'hard');

-- Insert sample data for SRT situations
INSERT INTO public.srt_situations (situation_text, difficulty_level) VALUES
('You are leading a team project with a tight deadline. One of your team members is consistently missing deadlines and affecting the overall progress.', 'medium'),
('During a training exercise, you notice that a fellow trainee is struggling and falling behind. Your instructor has not noticed this yet.', 'easy'),
('You have been assigned to organize a cultural event for your unit. You have limited resources and time constraints.', 'medium'),
('You witness a senior making an inappropriate comment to a junior colleague. No one else seems to have heard it.', 'hard'),
('You are posted in a remote area where internet connectivity is poor. You need to submit an important report urgently.', 'medium'),
('Your team is divided on an important decision. Half the team supports one approach while the other half supports a different approach.', 'hard'),
('You have been given additional responsibilities that conflict with your current workload. Your superior expects you to manage both effectively.', 'medium'),
('During a group discussion, you realize that the majority opinion is incorrect, but you are the most junior member present.', 'hard');

-- Insert sample data for WAT words
INSERT INTO public.wat_words (word, difficulty_level) VALUES
('Leadership', 'easy'),
('Challenge', 'easy'),
('Courage', 'easy'),
('Responsibility', 'medium'),
('Sacrifice', 'medium'),
('Integrity', 'medium'),
('Perseverance', 'medium'),
('Conflict', 'hard'),
('Adversity', 'hard'),
('Dedication', 'easy'),
('Innovation', 'medium'),
('Excellence', 'medium'),
('Determination', 'easy'),
('Teamwork', 'easy'),
('Discipline', 'medium'),
('Honor', 'medium'),
('Service', 'easy'),
('Commitment', 'medium'),
('Bravery', 'easy'),
('Unity', 'medium');