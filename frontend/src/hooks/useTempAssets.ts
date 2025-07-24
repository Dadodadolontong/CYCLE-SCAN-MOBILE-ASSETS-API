import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';

export interface TempAsset {
  id: string;
  description: string;
  model?: string | null;
  build?: string | null;
  location?: string | null;
  barcode: string;
  created_by: string;
  converted?: string | null;
  conversion_date?: string | null;
  converted_by?: string | null;
  cycle_count_task_id?: string | null;
  created_at: string;
  updated_at: string;
  status?: 'counted'; // for compatibility with old code
}

export const useTempAssets = () => {
  return useQuery({
    queryKey: ['temp_assets'],
    queryFn: async () => {
      const data = await fastapiClient.get<TempAsset[]>('/temp-assets');
      // Add status: 'counted' for compatibility
      return data.map(asset => ({ ...asset, status: 'counted' as const }));
    },
  });
};

export const useCreateTempAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      description,
      model,
      build,
      location_id,
      barcode,
      cycle_count_task_id,
    }: {
      description: string;
      model?: string;
      build?: string;
      location_id: string | null;
      barcode: string;
      cycle_count_task_id?: string | null;
    }) => {
      const payload: any = {
        description,
        model: model || null,
        build: build || null,
        location: location_id,
        barcode,
      };
      if (cycle_count_task_id) payload.cycle_count_task_id = cycle_count_task_id;
      const data = await fastapiClient.post<TempAsset>('/temp-assets', payload);
      return { ...data, status: 'counted' as const };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temp_assets'] });
    },
  });
};