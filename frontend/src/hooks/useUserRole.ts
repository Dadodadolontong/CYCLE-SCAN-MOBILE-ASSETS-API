import { useQuery } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';
import { useAuth } from '@/contexts/FastAPIAuthContext';

export const useUserRole = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      try {
        const response = await fastapiClient.get<{ role: string }>(`/users/${user.id}/role`);
        return response.role || 'user';
      } catch (error: any) {
        // If no role found or user doesn't exist, default to 'user'
        if (error.message?.includes('404') || error.message?.includes('not found')) {
          return 'user';
        }
        throw error;
      }
    },
    enabled: !!user?.id,
  });
};