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