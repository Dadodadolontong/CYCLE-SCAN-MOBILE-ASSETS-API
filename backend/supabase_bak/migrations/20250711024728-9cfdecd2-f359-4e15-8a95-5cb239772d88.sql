-- Drop the current restrictive policy
DROP POLICY "Only admins can view oauth providers" ON public.oauth_providers;

-- Create new policy allowing public to view active providers
CREATE POLICY "Public can view active oauth providers" 
  ON public.oauth_providers 
  FOR SELECT 
  USING (is_active = true);

-- Admins can still view all providers (active and inactive)
CREATE POLICY "Admins can view all oauth providers" 
  ON public.oauth_providers 
  FOR SELECT 
  USING (is_admin());