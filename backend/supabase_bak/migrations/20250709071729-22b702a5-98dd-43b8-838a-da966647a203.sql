-- Update assets table to link location field to locations table
-- First, add a new location_id column as UUID
ALTER TABLE public.assets 
ADD COLUMN location_id UUID REFERENCES public.locations(id);

-- Drop the old text-based location column
ALTER TABLE public.assets 
DROP COLUMN location;

-- Rename location_id to location for consistency
ALTER TABLE public.assets 
RENAME COLUMN location_id TO location;

-- Add index for better performance on location lookups
CREATE INDEX idx_assets_location ON public.assets(location);