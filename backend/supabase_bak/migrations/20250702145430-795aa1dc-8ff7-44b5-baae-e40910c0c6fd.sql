-- Create locations table for better location management
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  warehouse TEXT NOT NULL,
  zone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table for better category management
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cycle count tasks table
CREATE TABLE public.cycle_count_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location_filter TEXT,
  category_filter TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, completed, cancelled
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cycle count items table (assets included in each task)
CREATE TABLE public.cycle_count_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.cycle_count_tasks(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  expected_location TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, counted, missing, found_elsewhere
  actual_location TEXT,
  counted_at TIMESTAMP WITH TIME ZONE,
  counted_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, asset_id)
);

-- Enable RLS on new tables
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_count_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_count_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for locations
CREATE POLICY "Everyone can view locations" 
ON public.locations 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify locations" 
ON public.locations 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS policies for categories
CREATE POLICY "Everyone can view categories" 
ON public.categories 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify categories" 
ON public.categories 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS policies for cycle_count_tasks
CREATE POLICY "Everyone can view tasks" 
ON public.cycle_count_tasks 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can create tasks" 
ON public.cycle_count_tasks 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Task creators and assignees can update tasks" 
ON public.cycle_count_tasks 
FOR UPDATE 
TO authenticated
USING (auth.uid() = created_by OR auth.uid() = assigned_to);

CREATE POLICY "Only admins can delete tasks" 
ON public.cycle_count_tasks 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS policies for cycle_count_items
CREATE POLICY "Everyone can view count items" 
ON public.cycle_count_items 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can create count items for their tasks" 
ON public.cycle_count_items 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cycle_count_tasks 
    WHERE id = task_id AND (created_by = auth.uid() OR assigned_to = auth.uid())
  )
);

CREATE POLICY "Users can update count items for their tasks" 
ON public.cycle_count_items 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cycle_count_tasks 
    WHERE id = task_id AND (created_by = auth.uid() OR assigned_to = auth.uid())
  )
);

-- Add update triggers
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cycle_count_tasks_updated_at
  BEFORE UPDATE ON public.cycle_count_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_cycle_count_tasks_status ON public.cycle_count_tasks(status);
CREATE INDEX idx_cycle_count_tasks_assigned_to ON public.cycle_count_tasks(assigned_to);
CREATE INDEX idx_cycle_count_tasks_created_by ON public.cycle_count_tasks(created_by);
CREATE INDEX idx_cycle_count_items_task_id ON public.cycle_count_items(task_id);
CREATE INDEX idx_cycle_count_items_asset_id ON public.cycle_count_items(asset_id);
CREATE INDEX idx_cycle_count_items_status ON public.cycle_count_items(status);