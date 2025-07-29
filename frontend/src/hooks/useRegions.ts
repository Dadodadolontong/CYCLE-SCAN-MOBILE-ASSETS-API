import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';
import { Country } from './useCountries';

export interface AssignedUser {
  user_id: string;
  role: string;
  display_name: string | null;
  assignment_id: string;
}

export interface Region {
  id: string;
  name: string;
  country_id: string;
  country?: Country;
  assigned_users: AssignedUser[];
  created_at: string;
  updated_at: string;
}

export interface RegionCreate {
  name: string;
  country_id: string;
}

export interface RegionUpdate {
  name?: string;
  country_id?: string;
}

export const useRegions = (countryId?: string) => {
  return useQuery({
    queryKey: ['regions', countryId],
    queryFn: async () => {
      const endpoint = countryId ? `/locations/regions?country_id=${countryId}` : '/locations/regions';
      const data = await fastapiClient.get<Region[]>(endpoint);
      return data.sort((a, b) => a.name.localeCompare(b.name));
    },
  });
};

export const useCreateRegion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (region: RegionCreate) => {
      const data = await fastapiClient.post<Region>('/locations/regions', region);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });
};

export const useUpdateRegion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: RegionUpdate }) => {
      const data = await fastapiClient.put<Region>(`/locations/regions/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });
};

export const useDeleteRegion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await fastapiClient.delete(`/locations/regions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });
};