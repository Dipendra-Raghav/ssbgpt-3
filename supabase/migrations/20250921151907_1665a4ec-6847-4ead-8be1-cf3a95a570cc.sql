-- Add room_file_url column to rooms table for admin uploaded files
ALTER TABLE public.rooms 
ADD COLUMN room_file_url TEXT;

-- Add phone column to profiles table if it doesn't exist (it already exists based on schema)
-- No need to add as it already exists

-- Add comment to explain the room_file_url usage
COMMENT ON COLUMN public.rooms.room_file_url IS 'URL to the room file (PDF, PPDT image, etc.) uploaded by admin for participants to view during the session';