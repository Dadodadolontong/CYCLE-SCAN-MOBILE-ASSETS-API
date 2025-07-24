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