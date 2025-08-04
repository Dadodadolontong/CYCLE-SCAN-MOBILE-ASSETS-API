import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fastapiClient } from '@/integrations/fastapi/client';
import { toast } from '@/hooks/use-toast';
import type { 
  ERPSyncResponse, 
  SyncHistoryResponse, 
  ERPSyncConfig, 
  OracleConnectionTest 
} from '@/integrations/fastapi/client';

export const useERPSyncHistory = (limit: number = 50) => {
  return useQuery({
    queryKey: ['erp', 'sync-history', limit],
    queryFn: () => fastapiClient.getSyncHistory(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useERPSyncConfig = () => {
  return useQuery({
    queryKey: ['erp', 'sync-config'],
    queryFn: () => fastapiClient.getSyncConfig(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTestOracleConnection = () => {
  return useMutation({
    mutationFn: () => fastapiClient.testOracleConnection(),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Connection Test Successful",
          description: data.message,
        });
      } else {
        toast({
          title: "Connection Test Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Connection Test Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });
};

export const useSyncAssetsFromOracle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ forceFullSync }: { forceFullSync: boolean }) => 
      fastapiClient.syncAssetsFromOracle(forceFullSync),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Asset Sync Successful",
          description: `Processed ${data.assets_processed} assets (${data.assets_created} created, ${data.assets_updated} updated)`,
        });
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['erp', 'sync-history'] });
        queryClient.invalidateQueries({ queryKey: ['erp', 'sync-config'] });
        queryClient.invalidateQueries({ queryKey: ['assets'] });
      } else {
        toast({
          title: "Asset Sync Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Asset Sync Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });
};

export const useSyncLocationsFromOracle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => fastapiClient.syncLocationsFromOracle(),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Location Sync Successful",
          description: `Synced ${data.locations_synced} locations`,
        });
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['erp', 'sync-history'] });
        queryClient.invalidateQueries({ queryKey: ['erp', 'sync-config'] });
        queryClient.invalidateQueries({ queryKey: ['locations'] });
        queryClient.invalidateQueries({ queryKey: ['branches'] });
      } else {
        toast({
          title: "Location Sync Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Location Sync Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });
}; 