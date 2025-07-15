import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';

export interface Country {
  id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
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

export const useBranches = (regionId?: string) => {
  return useQuery({
    queryKey: ['branches', regionId],
    queryFn: async () => {
      const endpoint = regionId ? `/locations/branches?region_id=${regionId}` : '/locations/branches';
      const data = await fastapiClient.get<Branch[]>(endpoint);
      return data.sort((a, b) => a.name.localeCompare(b.name));
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