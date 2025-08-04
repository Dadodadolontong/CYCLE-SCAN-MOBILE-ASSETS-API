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
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  region_id: string;
  region?: Region;
  country?: Country;
  assigned_users: AssignedUser[];
  created_at: string;
  updated_at: string;
}

export interface BranchCreate {
  name: string;
  region_id: string;
}

export interface BranchUpdate {
  name?: string;
  region_id?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export const useBranches = (regionId?: string, search?: string, skip: number = 0, limit: number = 20) => {
  return useQuery({
    queryKey: ['branches', regionId, search, skip, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (regionId) params.append('region_id', regionId);
      if (search) params.append('search', search);
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());
      
      const data = await fastapiClient.get<PaginatedResponse<Branch>>(`/locations/branches?${params.toString()}`);
      return data;
    },
  });
};

export const useCreateBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (branch: BranchCreate) => {
      const data = await fastapiClient.post<Branch>('/locations/branches', branch);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });
};

export const useUpdateBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: BranchUpdate }) => {
      const data = await fastapiClient.put<Branch>(`/locations/branches/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });
};

export const useDeleteBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await fastapiClient.delete(`/locations/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });
};