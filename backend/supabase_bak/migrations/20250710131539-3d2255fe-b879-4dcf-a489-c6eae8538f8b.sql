-- Add reporting structure to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN reports_to uuid REFERENCES public.user_roles(user_id);

-- Create countries table
CREATE TABLE public.countries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE, -- ISO country code
  accounting_manager_id uuid REFERENCES public.user_roles(user_id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_country_manager UNIQUE (accounting_manager_id)
);

-- Create regions table
CREATE TABLE public.regions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  controller_id uuid REFERENCES public.user_roles(user_id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_region_controller UNIQUE (controller_id)
);

-- Create branches table
CREATE TABLE public.branches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  manager_id uuid REFERENCES public.user_roles(user_id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_branch_manager UNIQUE (manager_id)
);

-- Update locations table to reference branches
ALTER TABLE public.locations 
ADD COLUMN branch_id uuid REFERENCES public.branches(id);

-- Create assignment tables for many-to-many relationships
CREATE TABLE public.user_country_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.user_roles(user_id) ON DELETE CASCADE,
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, country_id)
);

CREATE TABLE public.user_region_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.user_roles(user_id) ON DELETE CASCADE,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, region_id)
);

CREATE TABLE public.user_branch_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.user_roles(user_id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, branch_id)
);

-- Enable RLS on new tables
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_country_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_region_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branch_assignments ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_regions_country_id ON public.regions(country_id);
CREATE INDEX idx_branches_region_id ON public.branches(region_id);
CREATE INDEX idx_locations_branch_id ON public.locations(branch_id);
CREATE INDEX idx_user_country_assignments_user_id ON public.user_country_assignments(user_id);
CREATE INDEX idx_user_region_assignments_user_id ON public.user_region_assignments(user_id);
CREATE INDEX idx_user_branch_assignments_user_id ON public.user_branch_assignments(user_id);
CREATE INDEX idx_user_roles_reports_to ON public.user_roles(reports_to);

-- Add triggers for updated_at columns
CREATE TRIGGER update_countries_updated_at
  BEFORE UPDATE ON public.countries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_regions_updated_at
  BEFORE UPDATE ON public.regions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();