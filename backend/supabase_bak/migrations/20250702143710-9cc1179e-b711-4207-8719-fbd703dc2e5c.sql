-- Create assets table to store synced data from ERP
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  erp_asset_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  barcode TEXT,
  model TEXT,
  build TEXT,
  category TEXT,
  location TEXT,
  status TEXT DEFAULT 'active',
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sync_logs table to track sync operations
CREATE TABLE public.sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'manual' or 'scheduled'
  status TEXT NOT NULL, -- 'running', 'completed', 'failed'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  assets_synced INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  error_details JSONB,
  initiated_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for assets (all authenticated users can read, admins can modify)
CREATE POLICY "Everyone can view assets" 
ON public.assets 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify assets" 
ON public.assets 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create policies for sync_logs 
CREATE POLICY "Everyone can view sync logs" 
ON public.sync_logs 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Only admins can create sync logs" 
ON public.sync_logs 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create user roles table and enum if not exists
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_assets_erp_id ON public.assets(erp_asset_id);
CREATE INDEX idx_assets_barcode ON public.assets(barcode);
CREATE INDEX idx_assets_location ON public.assets(location);
CREATE INDEX idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX idx_sync_logs_created_at ON public.sync_logs(started_at);

-- Insert a test admin user role (you'll need to replace with actual user ID)
-- INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-0000-0000-000000000000', 'admin');