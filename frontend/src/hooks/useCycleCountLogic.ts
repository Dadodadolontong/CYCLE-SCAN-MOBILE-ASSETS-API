import { useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useCreateTempAsset, useTempAssets, type TempAsset } from "@/hooks/useTempAssets";
import { useCycleCountTaskById, useUpdateCycleCountTask, useCycleCountItems, useCreateCycleCountItem } from "@/hooks/useCycleCountTasks";
import { useAuth } from "@/contexts/FastAPIAuthContext";
import { useLocations } from "@/hooks/useLocations";
import { fastapiClient } from '@/integrations/fastapi/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useAssetCount(location: string | undefined, category: string | undefined) {
  return useQuery({
    queryKey: ['asset-count', location, category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (location) params.append('location', location);
      if (category) params.append('category', category);
      const data = await fastapiClient.get<{ count: number }>(`/assets/count?${params.toString()}`);
      return data.count;
    }
  });
}

export const useCycleCountLogic = (taskId: string | undefined) => {
  const { data: tempAssets = [], isLoading: tempAssetsLoading } = useTempAssets();
  const { data: cycleCountItems = [], isLoading: cycleCountItemsLoading } = useCycleCountItems(taskId);
  const { data: locationsData = { items: [], total: 0 }, isLoading: locationsLoading } = useLocations();
  const locations = locationsData.items || [];
  const createCycleCountItem = useCreateCycleCountItem();
  const createTempAsset = useCreateTempAsset();
  const updateTask = useUpdateCycleCountTask();
  const { data: currentTask, isLoading: taskLoading } = useCycleCountTaskById(taskId);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showScanner, setShowScanner] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const { toast } = useToast();

  const currentTaskLocation = currentTask?.location_filter 
    ? locations.find(loc => loc.id === currentTask.location_filter)?.name || 'Unknown location'
    : 'All locations';
  const currentUserId = user?.id || 'unknown';

  const generateTempTagNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}-${currentUserId}`;
  };

  const processBarcode = async (barcode: string) => {
    if (!hasStarted && !currentTask?.started_at && currentTask && taskId) {
      try {
        await updateTask.mutateAsync({
          id: taskId,
          updates: {
            name: currentTask.name,
            status: 'active',
            started_at: new Date().toISOString(),
          },
        });
        setHasStarted(true);
        toast({
          title: "Counting Started",
          description: "Task activated automatically on first scan.",
          variant: "default",
        });
      } catch (error) {
        toast({
          title: "Error Starting Task",
          description: "Failed to start the counting task.",
          variant: "destructive",
        });
        return;
      }
    }

    let asset = null;
    try {
      asset = await fastapiClient.get<any>(`/assets/barcode/${encodeURIComponent(barcode.trim())}`);
    } catch (error: any) {
      if (error.message && error.message.toLowerCase().includes('not found')) {
        asset = null;
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to search for asset.",
          variant: "destructive",
        });
        return;
      }
    }

    if (asset) {
      const existingItem = (cycleCountItems || []).find(item => item.asset_id === asset.id);
      if (existingItem) {
        toast({
          title: "Already Counted",
          description: `${asset.name} has already been counted.`,
          variant: "default",
        });
      } else {
        const assetLocation = locations.find(loc => loc.id === asset.location);
        createCycleCountItem.mutate({
          task_id: taskId!,
          asset_id: asset.id,
          expected_location: assetLocation?.name,
          actual_location: currentTaskLocation,
          status: 'counted',
        }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cycle_count_items', taskId] });
            toast({
              title: "Asset Counted",
              description: `${asset.name} has been counted successfully.`,
              variant: "default",
            });
          },
          onError: (error) => {
            toast({
              title: "Error Counting Asset",
              description: "Failed to count the asset. Please try again.",
              variant: "destructive",
            });
          },
        });
      }
    } else {
      toast({
        title: "Asset Not Found",
        description: `No asset found with barcode: ${barcode}`,
        variant: "destructive",
      });
    }
  };

  const handleScanSuccess = (barcode: string) => {
    processBarcode(barcode);
    setShowScanner(false);
  };

  const handleManualEntry = () => {
    if (manualBarcode.trim()) {
      processBarcode(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  const handleCreateTempAsset = (data: { description: string; model?: string; build?: string }) => {
    if (!data.description.trim()) {
      toast({
        title: "Description Required",
        description: "Please enter an asset description.",
        variant: "destructive",
      });
      return;
    }
    const tempTagNumber = generateTempTagNumber();
    createTempAsset.mutate({
      description: data.description,
      model: data.model || undefined,
      build: data.build || undefined,
      location: currentTask?.location_filter || null,
      barcode: tempTagNumber,
      cycle_count_task_id: currentTask?.id || null,
      created_by: currentUserId,
    }, {
      onSuccess: () => {
        toast({
          title: "Temporary Asset Created",
          description: `Asset created with tag number: ${tempTagNumber}`,
          variant: "default",
        });
      },
    });
  };

  const handleAssetToggle = (itemId: string) => {};

  const handleCompleteTask = async () => {
    if (!currentTask || !taskId) return;
    try {
      await updateTask.mutateAsync({
        id: taskId,
        updates: {
          name: currentTask.name, // Always include name
          status: 'completed',
          completed_at: new Date().toISOString(),
        },
      });
      setShowCompletionSummary(true);
      toast({
        title: "Task Completed",
        description: "Cycle count has been completed successfully.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error Completing Task",
        description: "Failed to complete the counting task.",
        variant: "destructive",
      });
    }
  };

  return {
    showScanner,
    setShowScanner,
    manualBarcode,
    setManualBarcode,
    searchTerm,
    setSearchTerm,
    showCompletionSummary,
    currentTask,
    currentTaskLocation,
    isLoading: taskLoading || tempAssetsLoading || cycleCountItemsLoading || locationsLoading,
    scannedItems: cycleCountItems || [],
    hasStarted,
    handleScanSuccess,
    handleManualEntry,
    handleCreateTempAsset,
    handleAssetToggle,
    handleCompleteTask,
    useAssetCount, // expose the hook for use in the page
    tempAssets, // expose temp assets for filtering in page
  };
};