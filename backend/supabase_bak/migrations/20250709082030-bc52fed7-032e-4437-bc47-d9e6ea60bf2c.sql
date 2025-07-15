-- Add additional fields to temp_assets table
ALTER TABLE public.temp_assets 
ADD COLUMN converted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN conversion_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN converted_by UUID REFERENCES auth.users(id),
ADD COLUMN cycle_count_task_id UUID REFERENCES public.cycle_count_tasks(id);

-- Add index for better performance on cycle_count_task_id lookups
CREATE INDEX idx_temp_assets_cycle_count_task ON public.temp_assets(cycle_count_task_id);

-- Add index for converted flag for filtering
CREATE INDEX idx_temp_assets_converted ON public.temp_assets(converted);