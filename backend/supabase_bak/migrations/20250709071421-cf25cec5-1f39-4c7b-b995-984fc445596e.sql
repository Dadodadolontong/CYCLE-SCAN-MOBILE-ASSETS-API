-- Update locations table structure to match new requirements
-- Add erp_location_id column
ALTER TABLE public.locations 
ADD COLUMN erp_location_id TEXT;

-- Remove zone and warehouse columns
ALTER TABLE public.locations 
DROP COLUMN zone,
DROP COLUMN warehouse;

-- Add index for erp_location_id for better performance
CREATE INDEX idx_locations_erp_id ON public.locations(erp_location_id);