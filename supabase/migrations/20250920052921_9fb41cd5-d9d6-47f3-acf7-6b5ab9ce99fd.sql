-- Allow users to view interview slots they have booked
CREATE POLICY "Users can view their booked slots" 
ON public.interview_slots 
FOR SELECT 
USING (
  is_available = false 
  AND EXISTS (
    SELECT 1 FROM public.interview_requests 
    WHERE interview_requests.slot_id = interview_slots.id 
    AND interview_requests.user_id = auth.uid()
  )
);