import { useQuery } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  // Add any other fields returned by your FastAPI UserOut schema
}

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const data = await fastapiClient.get<Profile[]>('/users');
      // Optionally sort by display_name if needed
      return data.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
    },
  });
};