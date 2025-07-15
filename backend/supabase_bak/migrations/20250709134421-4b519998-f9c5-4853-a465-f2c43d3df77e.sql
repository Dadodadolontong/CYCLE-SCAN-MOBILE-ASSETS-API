-- Enhanced Storage Security Policies
-- Add more restrictive policies for csv-uploads bucket
DROP POLICY IF EXISTS "Authenticated users can upload CSV files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view CSV files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete CSV files" ON storage.objects;

-- Create user-specific upload policy with path restrictions
CREATE POLICY "Users can upload to their own folder in csv-uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'csv-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND array_length(string_to_array(name, '/'), 1) = 2
);

-- Create secure view policy for CSV files
CREATE POLICY "Users can view their own CSV files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'csv-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create secure delete policy for CSV files
CREATE POLICY "Users can delete their own CSV files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'csv-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create security definer function for admin role verification
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = is_admin.user_id 
    AND role = 'admin'
  );
$$;

-- Enhanced audit logging function with IP and user agent
CREATE OR REPLACE FUNCTION public.log_security_event(
  _action text,
  _resource_type text,
  _resource_id text DEFAULT NULL,
  _details jsonb DEFAULT NULL,
  _ip_address inet DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    _action,
    _resource_type,
    _resource_id,
    _details,
    _ip_address,
    _user_agent
  );
END;
$$;

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or user ID
  action text NOT NULL,
  attempts integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "System manages rate limits"
ON public.rate_limits FOR ALL
USING (false)
WITH CHECK (false);

-- Create rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier text,
  _action text,
  _max_attempts integer DEFAULT 5,
  _window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
BEGIN
  -- Clean up old entries
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '1 hour';
  
  -- Check if currently blocked
  IF EXISTS (
    SELECT 1 FROM public.rate_limits 
    WHERE identifier = _identifier 
    AND action = _action 
    AND blocked_until > now()
  ) THEN
    RETURN false;
  END IF;
  
  -- Get current window
  SELECT attempts, window_start INTO current_attempts, window_start_time
  FROM public.rate_limits 
  WHERE identifier = _identifier 
  AND action = _action 
  AND window_start > now() - (_window_minutes || ' minutes')::interval;
  
  IF current_attempts IS NULL THEN
    -- First attempt in this window
    INSERT INTO public.rate_limits (identifier, action, attempts, window_start)
    VALUES (_identifier, _action, 1, now());
    RETURN true;
  ELSIF current_attempts < _max_attempts THEN
    -- Increment attempts
    UPDATE public.rate_limits 
    SET attempts = attempts + 1 
    WHERE identifier = _identifier AND action = _action;
    RETURN true;
  ELSE
    -- Rate limit exceeded, block for the window duration
    UPDATE public.rate_limits 
    SET blocked_until = now() + (_window_minutes || ' minutes')::interval
    WHERE identifier = _identifier AND action = _action;
    RETURN false;
  END IF;
END;
$$;

-- Create session tracking table for enhanced monitoring
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start timestamp with time zone DEFAULT now(),
  session_end timestamp with time zone,
  ip_address inet,
  user_agent text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions FOR SELECT
USING (auth.uid() = user_id);

-- Only system can create/update sessions
CREATE POLICY "System manages sessions"
ON public.user_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "System updates sessions"
ON public.user_sessions FOR UPDATE
USING (true);

-- Add unique constraints and indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_identifier_action 
ON public.rate_limits(identifier, action);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
ON public.user_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_active 
ON public.user_sessions(is_active, session_start);

-- Update existing RLS policies to use the new security function
DROP POLICY IF EXISTS "Only admins can modify assets" ON public.assets;
CREATE POLICY "Only admins can modify assets"
ON public.assets FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can modify categories" ON public.categories;
CREATE POLICY "Only admins can modify categories"
ON public.categories FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can modify locations" ON public.locations;
CREATE POLICY "Only admins can modify locations"
ON public.locations FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can modify oauth providers" ON public.oauth_providers;
CREATE POLICY "Only admins can modify oauth providers"
ON public.oauth_providers FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can view oauth providers" ON public.oauth_providers;
CREATE POLICY "Only admins can view oauth providers"
ON public.oauth_providers FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can modify system settings" ON public.system_settings;
CREATE POLICY "Only admins can modify system settings"
ON public.system_settings FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can view system settings" ON public.system_settings;
CREATE POLICY "Only admins can view system settings"
ON public.system_settings FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can create sync logs" ON public.sync_logs;
CREATE POLICY "Only admins can create sync logs"
ON public.sync_logs FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can delete tasks" ON public.cycle_count_tasks;
CREATE POLICY "Only admins can delete tasks"
ON public.cycle_count_tasks FOR DELETE
USING (public.is_admin());