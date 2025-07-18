import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';

export interface Asset {
  id: string;
  name: string;
  barcode: string | null;
  location: string | null;
  actualLocation?: string | null;
  category: string | null;
  status: 'pending' | 'counted' | 'missing';
  last_seen?: string | null;
  hasLocationMismatch?: boolean;
  erp_location_id?: string | null;
}

export const useAssets = () => {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const data = await fastapiClient.get<Asset[]>('/assets');
      
      // Transform database assets to include cycle count status
      return data.map(asset => ({
        ...asset
      })) as Asset[];
    },
  });
};

export const useUpdateAssetStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      last_seen 
    }: { 
      id: string; 
      status: 'pending' | 'counted' | 'missing';
      last_seen?: string;
    }) => {
      const updateData = {
        last_seen: status === 'counted' ? (last_seen || new Date().toISOString()) : undefined,
      };
      
      const data = await fastapiClient.put<Asset>(`/assets/${id}`, updateData);
      return { ...data, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
};

export const useAssetCount = () => {
  return useQuery({
    queryKey: ['asset-count'],
    queryFn: async () => {
      const data = await fastapiClient.get<{ count: number }>('/assets/count');
      return data.count;
    },
  });
};
