-- Fix rate limiting function to prevent duplicate key constraint violations
CREATE OR REPLACE FUNCTION public.check_rate_limit(_identifier text, _action text, _max_attempts integer DEFAULT 5, _window_minutes integer DEFAULT 15)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
  current_window_start timestamp with time zone;
BEGIN
  -- Calculate current window start time
  current_window_start := now() - (_window_minutes || ' minutes')::interval;
  
  -- Clean up old entries (older than 1 hour)
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
  
  -- Use UPSERT to handle rate limit tracking
  INSERT INTO public.rate_limits (identifier, action, attempts, window_start)
  VALUES (_identifier, _action, 1, now())
  ON CONFLICT (identifier, action) 
  DO UPDATE SET
    attempts = CASE 
      WHEN rate_limits.window_start <= current_window_start THEN 1  -- Reset if outside window
      ELSE rate_limits.attempts + 1  -- Increment if within window
    END,
    window_start = CASE 
      WHEN rate_limits.window_start <= current_window_start THEN now()  -- Reset window start
      ELSE rate_limits.window_start  -- Keep existing window start
    END,
    blocked_until = NULL,  -- Clear any previous blocks
    created_at = now()
  RETURNING attempts INTO current_attempts;
  
  -- Check if rate limit exceeded
  IF current_attempts >= _max_attempts THEN
    -- Update to block for the window duration
    UPDATE public.rate_limits 
    SET blocked_until = now() + (_window_minutes || ' minutes')::interval
    WHERE identifier = _identifier AND action = _action;
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- Clean up any existing problematic rate limit records
DELETE FROM public.rate_limits WHERE created_at < now() - interval '1 hour';