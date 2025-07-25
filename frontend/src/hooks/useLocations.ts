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
  console.log("🔍 [useLocations] Hook called");
  
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      console.log("🔍 [useLocations] Starting API call to /locations");
      try {
        const data = await fastapiClient.get<Location[]>('/locations');
        console.log("🔍 [useLocations] API call successful, locations count:", data?.length || 0);
        return data.sort((a, b) => a.name.localeCompare(b.name));
      } catch (error) {
        console.error("🔍 [useLocations] API call failed:", error);
        throw error;
      }
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