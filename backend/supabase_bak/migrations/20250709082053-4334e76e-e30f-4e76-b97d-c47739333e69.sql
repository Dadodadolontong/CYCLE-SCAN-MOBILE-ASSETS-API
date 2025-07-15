-- Create temp_assets table for temporary assets created during cycle counts
CREATE TABLE public.temp_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  model TEXT,
  build TEXT,
  location UUID REFERENCES public.locations(id),
  barcode TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.temp_assets ENABLE ROW LEVEL SECURITY;

-- Create policies for temp_assets
CREATE POLICY "Everyone can view temp assets" 
ON public.temp_assets 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can create temp assets" 
ON public.temp_assets 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own temp assets" 
ON public.temp_assets 
FOR UPDATE 
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own temp assets" 
ON public.temp_assets 
FOR DELETE 
TO authenticated
USING (auth.uid() = created_by);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_temp_assets_updated_at
  BEFORE UPDATE ON public.temp_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_temp_assets_barcode ON public.temp_assets(barcode);
CREATE INDEX idx_temp_assets_location ON public.temp_assets(location);
CREATE INDEX idx_temp_assets_created_by ON public.temp_assets(created_by);