import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';

export interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  assets_synced?: number;
  errors_count?: number;
  error_details?: any;
  initiated_by?: string;
  file_name?: string;
  records_processed?: number;
  scheduled_at?: string;
  schedule_type?: string;
  next_run_at?: string;
}

export interface DataStats {
  total_assets: number;
  total_locations: number;
  successful_imports: number;
}

export interface UploadResult {
  success: boolean;
  message: string;
  details: {
    processed: number;
    errors: number;
    error_details?: any;
  };
}

// Get sync logs
export const useSyncLogs = (limit: number = 20) => {
  return useQuery({
    queryKey: ['sync-logs', limit],
    queryFn: async () => {
      const data = await fastapiClient.get<SyncLog[]>(`/data-management/sync-logs?limit=${limit}`);
      return data;
    },
  });
};

// Get data statistics
export const useDataStats = () => {
  return useQuery({
    queryKey: ['data-stats'],
    queryFn: async () => {
      // Fetch stats from the existing endpoint
      const data = await fastapiClient.get<DataStats>('/data-management/stats');
      // Fetch accurate asset count from the new endpoint
      const assetCountResp = await fastapiClient.get<{ count: number }>('/assets/count');
      return {
        ...data,
        total_assets: assetCountResp.count,
      };
    },
  });
};

// Upload regions CSV
export const useUploadRegionsCsv = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const data = await fastapiClient.post<UploadResult>('/data-management/upload/regions', formData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['data-stats'] });
    },
  });
};

// Upload locations CSV
export const useUploadLocationsCsv = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const data = await fastapiClient.post<UploadResult>('/data-management/upload/locations', formData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['data-stats'] });
    },
  });
};

// Upload assets CSV
export const useUploadAssetsCsv = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const data = await fastapiClient.post<UploadResult>('/data-management/upload/assets', formData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['data-stats'] });
    },
  });
}; 