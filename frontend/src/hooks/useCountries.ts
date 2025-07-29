import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';

export interface AssignedUser {
  user_id: string;
  role: string;
  display_name: string | null;
  assignment_id: string;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  accounting_manager_id?: string;
  assigned_users: AssignedUser[];
  created_at: string;
  updated_at: string;
}

export interface CountryCreate {
  name: string;
  code: string;
}

export interface CountryUpdate {
  name?: string;
  code?: string;
}

export const useCountries = () => {
  return useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const data = await fastapiClient.get<Country[]>('/locations/countries');
      return data.sort((a, b) => a.name.localeCompare(b.name));
    },
  });
};

export const useCreateCountry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (country: CountryCreate) => {
      const data = await fastapiClient.post<Country>('/locations/countries', country);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] });
    },
  });
};

export const useUpdateCountry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: CountryUpdate }) => {
      const data = await fastapiClient.put<Country>(`/locations/countries/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] });
    },
  });
};

export const useDeleteCountry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await fastapiClient.delete(`/locations/countries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] });
    },
  });
};