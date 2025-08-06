import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';
import { toast } from '@/hooks/use-toast';
import type { 
  ERPSyncResponse, 
  SyncHistoryResponse, 
  ERPSyncConfig, 
  OracleConnectionTest 
} from '@/integrations/fastapi/client';

// ERP Sync History
export const useERPSyncHistory = (limit: number = 50) => {
  return useQuery({
    queryKey: ['erp-sync-history', limit],
    queryFn: async () => {
      return await fastapiClient.getSyncHistory(limit);
    },
  });
};

// ERP Sync Configuration
export const useERPSyncConfig = () => {
  return useQuery({
    queryKey: ['erp-sync-config'],
    queryFn: async () => {
      return await fastapiClient.getSyncConfig();
    },
  });
};

// Test Oracle Connection
export const useTestOracleConnection = () => {
  return useMutation({
    mutationFn: async () => {
      return await fastapiClient.testOracleConnection();
    },
  });
};

// Background Task Status
export const useTaskStatus = (taskId: string | null) => {
  return useQuery({
    queryKey: ['task-status', taskId],
    queryFn: async () => {
      if (!taskId) throw new Error('No task ID provided');
      return await fastapiClient.getTaskStatus(taskId);
    },
    enabled: !!taskId,
    refetchInterval: (data) => {
      // Poll every 2 seconds if task is still running
      return data?.status === 'PENDING' || data?.status === 'PROGRESS' ? 2000 : false;
    },
    refetchIntervalInBackground: true,
  });
};

// Sync Assets from Oracle (Background Task)
export const useSyncAssetsFromOracle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ forceFullSync }: { forceFullSync: boolean }) => {
      return await fastapiClient.syncAssetsFromOracle(forceFullSync);
    },
    onSuccess: (data) => {
      // Invalidate sync history to show new task
      queryClient.invalidateQueries({ queryKey: ['erp-sync-history'] });
      queryClient.invalidateQueries({ queryKey: ['erp-sync-config'] });
    },
  });
};

// Sync Locations from Oracle (Background Task)
export const useSyncLocationsFromOracle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return await fastapiClient.syncLocationsFromOracle();
    },
    onSuccess: (data) => {
      // Invalidate sync history to show new task
      queryClient.invalidateQueries({ queryKey: ['erp-sync-history'] });
      queryClient.invalidateQueries({ queryKey: ['erp-sync-config'] });
    },
  });
}; 