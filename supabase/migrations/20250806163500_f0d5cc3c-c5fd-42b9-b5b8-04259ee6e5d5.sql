-- Create rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  room_type TEXT NOT NULL CHECK (room_type IN ('ppdt_discussion', 'gd', 'lecturate')),
  scheduled_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  mod_name TEXT NOT NULL,
  mod_email TEXT,
  google_meet_link TEXT,
  room_image_url TEXT,
  max_participants INTEGER NOT NULL DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create room_enrollments table
CREATE TABLE public.room_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'attended', 'missed')),
  UNIQUE(room_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies for rooms (everyone can view active rooms)
CREATE POLICY "Anyone can view active rooms" 
ON public.rooms 
FOR SELECT 
USING (is_active = true);

-- Create policies for room_enrollments
CREATE POLICY "Users can view their own enrollments" 
ON public.room_enrollments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own enrollments" 
ON public.room_enrollments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollments" 
ON public.room_enrollments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own enrollments" 
ON public.room_enrollments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert 3 mock rooms
INSERT INTO public.rooms (title, description, room_type, scheduled_datetime, mod_name, mod_email, google_meet_link, room_image_url, max_participants) VALUES
(
  'PPDT Discussion Room',
  'Interactive discussion session for Picture Perception and Discussion Test strategies and techniques.',
  'ppdt_discussion',
  NOW() + INTERVAL '2 hours',
  'Major Singh',
  'major.singh@example.com',
  'https://meet.google.com/abc-defg-hij',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop',
  15
),
(
  'Group Discussion Room',
  'Practice group discussions on current affairs and defence-related topics.',
  'gd',
  NOW() + INTERVAL '4 hours',
  'Colonel Sharma',
  'col.sharma@example.com',
  'https://meet.google.com/klm-nopq-rst',
  'https://images.unsplash.com/photo-1515169067868-5387ec356754?w=400&h=300&fit=crop',
  20
),
(
  'Lecturate Room',
  'Educational lecture session covering defence academy preparation and leadership principles.',
  'lecturate',
  NOW() + INTERVAL '6 hours',
  'Brigadier Gupta',
  'brig.gupta@example.com',
  'https://meet.google.com/uvw-xyza-bcd',
  'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=300&fit=crop',
  25
);