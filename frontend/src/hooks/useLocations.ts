import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';

export interface Location {
  id: string;
  name: string;
  description?: string;
  erp_location_id?: string;
  branch_id?: string;
  created_at: string;
  updated_at: string;
}

export interface LocationCreate {
  name: string;
  description?: string;
  erp_location_id?: string;
  branch_id?: string;
}

export interface LocationUpdate {
  name?: string;
  description?: string;
  erp_location_id?: string;
  branch_id?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export const useLocations = (search?: string, skip: number = 0, limit: number = 20) => {
  return useQuery({
    queryKey: ['locations', search, skip, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());
      
      const data = await fastapiClient.get<PaginatedResponse<Location>>(`/locations?${params.toString()}`);
      return data;
    },
  });
};

export const useLocationsByName = (name?: string, skip: number = 0, limit: number = 20) => {
  return useQuery({
    queryKey: ['locations', 'name', name, skip, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (name) params.append('search', name);
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());
      
      const data = await fastapiClient.get<PaginatedResponse<Location>>(`/locations?${params.toString()}`);
      return data;
    },
    enabled: !!name,
  });
};

export const useLocationsByBranch = (branchId?: string, search?: string, skip: number = 0, limit: number = 20) => {
  return useQuery({
    queryKey: ['locations', 'branch', branchId, search, skip, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (branchId) params.append('branch_id', branchId);
      if (search) params.append('search', search);
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());
      
      const data = await fastapiClient.get<PaginatedResponse<Location>>(`/locations?${params.toString()}`);
      return data;
    },
    enabled: !!branchId,
  });
};

export const useCreateLocation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (location: LocationCreate) => {
      return await fastapiClient.post<Location>('/locations', location);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
};

export const useUpdateLocation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: LocationUpdate }) => {
      return await fastapiClient.put<Location>(`/locations/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
};

export const useDeleteLocation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await fastapiClient.delete(`/locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
};

export const useLocationCount = () => {
  return useQuery({
    queryKey: ['location-count'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());
      
      const data = await fastapiClient.get<{ count: number }>(`/locations/count`);
      return data;
    },
  });
};