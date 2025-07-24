-- Create OAuth sessions table for reliable configuration storage
CREATE TABLE public.oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Enable RLS
ALTER TABLE public.oauth_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create sessions (needed for OAuth flow)
CREATE POLICY "Anyone can create oauth sessions"
ON public.oauth_sessions
FOR INSERT
WITH CHECK (true);

-- Allow retrieval of non-expired sessions
CREATE POLICY "Anyone can read non-expired oauth sessions"
ON public.oauth_sessions
FOR SELECT
USING (expires_at > NOW());

-- Function to clean up expired OAuth sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_sessions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.oauth_sessions 
  WHERE expires_at < NOW();
$$;