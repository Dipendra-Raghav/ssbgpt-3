-- Create feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for feedback table
CREATE POLICY "Users can insert their own feedback" 
ON public.feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback" 
ON public.feedback 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admin can view all feedback
CREATE POLICY "Admin can view all feedback" 
ON public.feedback 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'admin@ssbgpt.com'::text);

-- Create interviewers table
CREATE TABLE public.interviewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  recommendations_count INTEGER NOT NULL DEFAULT 3,
  recommendation_places TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  image_url TEXT,
  experience_years INTEGER,
  specialization TEXT,
  rating DECIMAL(3,2) DEFAULT 4.5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security for interviewers
ALTER TABLE public.interviewers ENABLE ROW LEVEL SECURITY;

-- Create policies for interviewers table
CREATE POLICY "Anyone can view active interviewers" 
ON public.interviewers 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin can manage interviewers" 
ON public.interviewers 
FOR ALL 
USING ((auth.jwt() ->> 'email'::text) = 'admin@ssbgpt.com'::text);

-- Create interview slots table
CREATE TABLE public.interview_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interviewer_id UUID NOT NULL REFERENCES public.interviewers(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(interviewer_id, slot_date, slot_time)
);

-- Enable Row Level Security for interview slots
ALTER TABLE public.interview_slots ENABLE ROW LEVEL SECURITY;

-- Create policies for interview slots
CREATE POLICY "Anyone can view available slots" 
ON public.interview_slots 
FOR SELECT 
USING (is_available = true);

CREATE POLICY "Admin can manage interview slots" 
ON public.interview_slots 
FOR ALL 
USING ((auth.jwt() ->> 'email'::text) = 'admin@ssbgpt.com'::text);

-- Create interview requests table
CREATE TABLE public.interview_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  interviewer_id UUID NOT NULL REFERENCES public.interviewers(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES public.interview_slots(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  stripe_payment_intent_id TEXT,
  google_meet_link TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, slot_id)
);

-- Enable Row Level Security for interview requests
ALTER TABLE public.interview_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for interview requests
CREATE POLICY "Users can create their own interview requests" 
ON public.interview_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own interview requests" 
ON public.interview_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own interview requests" 
ON public.interview_requests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all interview requests" 
ON public.interview_requests 
FOR ALL 
USING ((auth.jwt() ->> 'email'::text) = 'admin@ssbgpt.com'::text);

-- Create trigger for updating updated_at columns
CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interviewers_updated_at
  BEFORE UPDATE ON public.interviewers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_slots_updated_at
  BEFORE UPDATE ON public.interview_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_requests_updated_at
  BEFORE UPDATE ON public.interview_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample interviewers
INSERT INTO public.interviewers (name, age, recommendations_count, recommendation_places, bio, experience_years, specialization, rating) VALUES
('Col. Rajesh Kumar', 45, 3, ARRAY['NDA', 'IMA', 'AFA'], 'Former Army Officer with 20 years of experience in SSB selection process. Recommended candidates who are now serving as officers in Indian Army.', 15, 'Army Selection', 4.8),
('Wing Cdr. Priya Sharma', 42, 3, ARRAY['AFA', 'NDA', 'IMA'], 'Indian Air Force officer with extensive experience in pilot selection. Has been part of SSB panels for over 12 years.', 12, 'Air Force Selection', 4.7),
('Lt. Cdr. Arjun Mehta', 40, 3, ARRAY['NDA', 'Naval Academy', 'INA'], 'Naval officer specializing in maritime operations. Expert in psychological testing and group tasks evaluation.', 10, 'Navy Selection', 4.6),
('Maj. Kavita Singh', 38, 3, ARRAY['OTA', 'IMA', 'NDA'], 'Army officer with specialization in technical entries. Known for her expertise in GTO tasks and leadership assessment.', 8, 'Technical Entry', 4.9),
('Sqn Ldr. Rohit Gupta', 44, 3, ARRAY['AFA', 'NDA', 'Flying Training'], 'Fighter pilot with combat experience. Specializes in pilot selection and psychological evaluation for aviation roles.', 16, 'Pilot Selection', 4.8);

-- Insert sample interview slots for each interviewer (next 30 days)
INSERT INTO public.interview_slots (interviewer_id, slot_date, slot_time)
SELECT 
  i.id,
  CURRENT_DATE + (d.day_offset || ' days')::INTERVAL,
  (ARRAY['09:00', '11:00', '14:00', '16:00'])[((d.day_offset + s.slot_offset) % 4) + 1]::TIME
FROM 
  public.interviewers i,
  generate_series(1, 30) AS d(day_offset),
  generate_series(0, 3) AS s(slot_offset)
WHERE i.is_active = true
ORDER BY i.id, d.day_offset, s.slot_offset;