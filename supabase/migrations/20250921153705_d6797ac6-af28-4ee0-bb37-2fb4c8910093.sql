-- Function to get participant counts for multiple rooms, bypassing RLS safely
CREATE OR REPLACE FUNCTION public.get_room_participant_counts(p_room_ids uuid[])
RETURNS TABLE (room_id uuid, participant_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT re.room_id, count(*)::int AS participant_count
  FROM public.room_enrollments re
  WHERE re.room_id = ANY(p_room_ids)
  GROUP BY re.room_id;
END;
$$;

-- Ensure only necessary privileges; allow authenticated users to execute
REVOKE ALL ON FUNCTION public.get_room_participant_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_room_participant_counts(uuid[]) TO authenticated;
