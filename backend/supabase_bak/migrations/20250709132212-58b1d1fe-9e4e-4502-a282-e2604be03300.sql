-- Create system_settings table for global configuration
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create audit_logs table for tracking admin actions
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create oauth_providers table for storing OAuth configurations
CREATE TABLE public.oauth_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  client_id text NOT NULL,
  auth_url text NOT NULL,
  token_url text NOT NULL,
  user_info_url text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add scheduling columns to sync_logs table
ALTER TABLE public.sync_logs 
ADD COLUMN scheduled_at timestamp with time zone,
ADD COLUMN schedule_type text,
ADD COLUMN next_run_at timestamp with time zone;

-- Enable RLS on new tables
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_providers ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_settings (admin only)
CREATE POLICY "Only admins can view system settings" 
ON public.system_settings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

CREATE POLICY "Only admins can modify system settings" 
ON public.system_settings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- RLS policies for audit_logs (admin only)
CREATE POLICY "Only admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

CREATE POLICY "System can create audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- RLS policies for oauth_providers (admin only)
CREATE POLICY "Only admins can view oauth providers" 
ON public.oauth_providers 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

CREATE POLICY "Only admins can modify oauth providers" 
ON public.oauth_providers 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- Create triggers for updated_at columns
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_oauth_providers_updated_at
  BEFORE UPDATE ON public.oauth_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action text,
  _resource_type text,
  _resource_id text DEFAULT NULL,
  _details jsonb DEFAULT NULL
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
    details
  ) VALUES (
    auth.uid(),
    _action,
    _resource_type,
    _resource_id,
    _details
  );
END;
$$;

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('app_name', '"Asset Management System"', 'Application display name'),
('max_upload_size', '10485760', 'Maximum file upload size in bytes (10MB)'),
('session_timeout', '3600', 'Session timeout in seconds'),
('allow_registration', 'true', 'Allow new user registration');