-- Create upload_sessions table for QR-based mobile uploads
CREATE TABLE IF NOT EXISTS public.upload_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id text NOT NULL,
  test_type text NOT NULL CHECK (test_type IN ('ppdt','srt','wat')),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own sessions
CREATE POLICY "Users can view their own upload sessions"
ON public.upload_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own upload sessions"
ON public.upload_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own upload sessions"
ON public.upload_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_token ON public.upload_sessions (token);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_user_session ON public.upload_sessions (user_id, session_id);

-- Create session_uploads table to sync mobile uploads back to desktop
CREATE TABLE IF NOT EXISTS public.session_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_session_id uuid REFERENCES public.upload_sessions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  session_id text NOT NULL,
  test_type text NOT NULL CHECK (test_type IN ('ppdt','srt','wat')),
  file_path text NOT NULL,
  public_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_uploads ENABLE ROW LEVEL SECURITY;

-- Only the owner can read their uploads
CREATE POLICY "Users can read their own session uploads"
ON public.session_uploads
FOR SELECT
USING (auth.uid() = user_id);

-- Do not create INSERT policy (inserts are done via Edge Function with service role)

-- Optimize for realtime payloads and subscriptions
ALTER TABLE public.session_uploads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_uploads;