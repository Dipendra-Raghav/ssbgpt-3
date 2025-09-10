-- Enable Row Level Security on evaluations table
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view only their own evaluations
CREATE POLICY "Users can view their own evaluations" 
ON public.evaluations 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for users to insert their own evaluations
CREATE POLICY "Users can insert their own evaluations" 
ON public.evaluations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own evaluations
CREATE POLICY "Users can update their own evaluations" 
ON public.evaluations 
FOR UPDATE 
USING (auth.uid() = user_id);