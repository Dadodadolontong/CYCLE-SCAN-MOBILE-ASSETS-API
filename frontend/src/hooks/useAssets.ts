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
  console.log("🔍 [useAssets] Hook called");
  
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      console.log("🔍 [useAssets] Starting API call to /assets");
      try {
        const data = await fastapiClient.get<Asset[]>('/assets');
        console.log("🔍 [useAssets] API call successful, assets count:", data?.length || 0);
        
        // Transform database assets to include cycle count status
        return data.map(asset => ({
          ...asset
        })) as Asset[];
      } catch (error) {
        console.error("🔍 [useAssets] API call failed:", error);
        throw error;
      }
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
  console.log("🔍 [useAssetCount] Hook called");
  
  return useQuery({
    queryKey: ['asset-count'],
    queryFn: async () => {
      console.log("🔍 [useAssetCount] Starting API call to /assets/count");
      try {
        const data = await fastapiClient.get<{ count: number }>('/assets/count');
        console.log("🔍 [useAssetCount] API call successful, count:", data.count);
        return data.count;
      } catch (error) {
        console.error("🔍 [useAssetCount] API call failed:", error);
        throw error;
      }
    },
  });
};
