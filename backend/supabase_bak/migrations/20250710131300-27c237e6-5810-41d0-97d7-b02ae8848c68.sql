-- Expand app_role enum to include new roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accounting_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'controller';

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

-- Create security functions for access control
CREATE OR REPLACE FUNCTION public.get_user_accessible_countries(user_id uuid DEFAULT auth.uid())
RETURNS TABLE(country_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  -- Direct country assignments for accounting managers
  SELECT uca.country_id
  FROM public.user_country_assignments uca
  JOIN public.user_roles ur ON ur.user_id = uca.user_id
  WHERE ur.user_id = get_user_accessible_countries.user_id
    AND ur.role = 'accounting_manager'
  
  UNION
  
  -- Countries through region assignments for controllers
  SELECT r.country_id
  FROM public.user_region_assignments ura
  JOIN public.regions r ON r.id = ura.region_id
  JOIN public.user_roles ur ON ur.user_id = ura.user_id
  WHERE ur.user_id = get_user_accessible_countries.user_id
    AND ur.role = 'controller'
  
  UNION
  
  -- Countries through branch assignments for managers and users
  SELECT r.country_id
  FROM public.user_branch_assignments uba
  JOIN public.branches b ON b.id = uba.branch_id
  JOIN public.regions r ON r.id = b.region_id
  JOIN public.user_roles ur ON ur.user_id = uba.user_id
  WHERE ur.user_id = get_user_accessible_countries.user_id
    AND ur.role IN ('manager', 'user');
$$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_regions(user_id uuid DEFAULT auth.uid())
RETURNS TABLE(region_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  -- Regions in accessible countries for accounting managers
  SELECT r.id
  FROM public.regions r
  WHERE r.country_id IN (
    SELECT country_id FROM public.get_user_accessible_countries(get_user_accessible_regions.user_id)
  )
  
  UNION
  
  -- Direct region assignments for controllers
  SELECT ura.region_id
  FROM public.user_region_assignments ura
  JOIN public.user_roles ur ON ur.user_id = ura.user_id
  WHERE ur.user_id = get_user_accessible_regions.user_id
    AND ur.role = 'controller'
  
  UNION
  
  -- Regions through branch assignments for managers and users
  SELECT b.region_id
  FROM public.user_branch_assignments uba
  JOIN public.branches b ON b.id = uba.branch_id
  JOIN public.user_roles ur ON ur.user_id = uba.user_id
  WHERE ur.user_id = get_user_accessible_regions.user_id
    AND ur.role IN ('manager', 'user');
$$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_branches(user_id uuid DEFAULT auth.uid())
RETURNS TABLE(branch_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  -- Branches in accessible regions (for accounting managers and controllers)
  SELECT b.id
  FROM public.branches b
  WHERE b.region_id IN (
    SELECT region_id FROM public.get_user_accessible_regions(get_user_accessible_branches.user_id)
  )
  
  UNION
  
  -- Direct branch assignments for managers and users
  SELECT uba.branch_id
  FROM public.user_branch_assignments uba
  JOIN public.user_roles ur ON ur.user_id = uba.user_id
  WHERE ur.user_id = get_user_accessible_branches.user_id
    AND ur.role IN ('manager', 'user');
$$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_locations(user_id uuid DEFAULT auth.uid())
RETURNS TABLE(location_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT l.id
  FROM public.locations l
  WHERE l.branch_id IN (
    SELECT branch_id FROM public.get_user_accessible_branches(get_user_accessible_locations.user_id)
  );
$$;

-- Create function to get user reports (direct and indirect)
CREATE OR REPLACE FUNCTION public.get_user_reports(manager_id uuid DEFAULT auth.uid())
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  WITH RECURSIVE user_hierarchy AS (
    -- Direct reports
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.reports_to = get_user_reports.manager_id
    
    UNION ALL
    
    -- Indirect reports
    SELECT ur.user_id
    FROM public.user_roles ur
    JOIN user_hierarchy uh ON uh.user_id = ur.reports_to
  )
  SELECT user_hierarchy.user_id FROM user_hierarchy;
$$;

-- Update RLS policies for new structure
-- Countries policies
CREATE POLICY "Admins can manage countries" ON public.countries
  FOR ALL USING (is_admin());

CREATE POLICY "Users can view accessible countries" ON public.countries
  FOR SELECT USING (
    id IN (SELECT country_id FROM public.get_user_accessible_countries())
  );

-- Regions policies
CREATE POLICY "Admins can manage regions" ON public.regions
  FOR ALL USING (is_admin());

CREATE POLICY "Users can view accessible regions" ON public.regions
  FOR SELECT USING (
    id IN (SELECT region_id FROM public.get_user_accessible_regions())
  );

-- Branches policies
CREATE POLICY "Admins can manage branches" ON public.branches
  FOR ALL USING (is_admin());

CREATE POLICY "Users can view accessible branches" ON public.branches
  FOR SELECT USING (
    id IN (SELECT branch_id FROM public.get_user_accessible_branches())
  );

-- Assignment table policies
CREATE POLICY "Admins can manage country assignments" ON public.user_country_assignments
  FOR ALL USING (is_admin());

CREATE POLICY "Users can view their country assignments" ON public.user_country_assignments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage region assignments" ON public.user_region_assignments
  FOR ALL USING (is_admin());

CREATE POLICY "Users can view their region assignments" ON public.user_region_assignments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage branch assignments" ON public.user_branch_assignments
  FOR ALL USING (is_admin());

CREATE POLICY "Users can view their branch assignments" ON public.user_branch_assignments
  FOR SELECT USING (user_id = auth.uid());

-- Update existing assets policy to use new location hierarchy
DROP POLICY IF EXISTS "Everyone can view assets" ON public.assets;
CREATE POLICY "Users can view accessible assets" ON public.assets
  FOR SELECT USING (
    is_admin() OR 
    location IN (SELECT location_id FROM public.get_user_accessible_locations())
  );

-- Update existing locations policy
DROP POLICY IF EXISTS "Everyone can view locations" ON public.locations;
CREATE POLICY "Users can view accessible locations" ON public.locations
  FOR SELECT USING (
    is_admin() OR 
    id IN (SELECT location_id FROM public.get_user_accessible_locations())
  );

-- Validation trigger to ensure role hierarchy is maintained
CREATE OR REPLACE FUNCTION public.validate_role_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if reporting relationship follows proper hierarchy
  IF NEW.reports_to IS NOT NULL THEN
    DECLARE
      manager_role app_role;
      subordinate_role app_role := NEW.role;
    BEGIN
      SELECT role INTO manager_role 
      FROM public.user_roles 
      WHERE user_id = NEW.reports_to;
      
      -- Validate hierarchy: user -> manager -> controller -> accounting_manager
      IF subordinate_role = 'user' AND manager_role NOT IN ('manager', 'controller', 'accounting_manager') THEN
        RAISE EXCEPTION 'Users can only report to managers, controllers, or accounting managers';
      ELSIF subordinate_role = 'manager' AND manager_role NOT IN ('controller', 'accounting_manager') THEN
        RAISE EXCEPTION 'Managers can only report to controllers or accounting managers';
      ELSIF subordinate_role = 'controller' AND manager_role != 'accounting_manager' THEN
        RAISE EXCEPTION 'Controllers can only report to accounting managers';
      ELSIF subordinate_role = 'accounting_manager' AND NEW.reports_to IS NOT NULL THEN
        RAISE EXCEPTION 'Accounting managers cannot report to anyone';
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_role_hierarchy_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.validate_role_hierarchy();