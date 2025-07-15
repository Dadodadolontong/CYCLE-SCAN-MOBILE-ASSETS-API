-- Update cycle_count_tasks to use location_id instead of location name
-- First, add a new column for location_id
ALTER TABLE public.cycle_count_tasks 
ADD COLUMN location_filter_id uuid REFERENCES public.locations(id);

-- Migrate existing data: convert location names to location IDs
UPDATE public.cycle_count_tasks 
SET location_filter_id = (
  SELECT id FROM public.locations 
  WHERE name = cycle_count_tasks.location_filter
)
WHERE location_filter IS NOT NULL AND location_filter != 'all';

-- Drop the old text column
ALTER TABLE public.cycle_count_tasks 
DROP COLUMN location_filter;

-- Rename the new column to location_filter
ALTER TABLE public.cycle_count_tasks 
RENAME COLUMN location_filter_id TO location_filter;