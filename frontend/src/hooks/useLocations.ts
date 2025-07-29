import { useQuery } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';

export interface Location {
  id: string;
  name: string;
  description?: string;
  branch_id?: string;
  created_at: string;
  updated_at: string;
}

export const useLocations = () => {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const data = await fastapiClient.get<Location[]>('/locations');
      return data.sort((a, b) => a.name.localeCompare(b.name));
    },
  });
};

export const useLocationsByName = (name?: string) => {
  return useQuery({
    queryKey: ['locations', 'name', name],
    queryFn: async () => {
      const data = await fastapiClient.get<Location[]>(`/locations?search=${encodeURIComponent(name || '')}`);
      return data.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!name,
  });
};