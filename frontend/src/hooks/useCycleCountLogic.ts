import { useState, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useAssets, type Asset } from "@/hooks/useAssets";
import { useCreateTempAsset, useTempAssets, type TempAsset } from "@/hooks/useTempAssets";
import { useCycleCountTaskById, useUpdateCycleCountTask, useCycleCountItems, useCreateCycleCountItem } from "@/hooks/useCycleCountTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useLocations } from "@/hooks/useLocations";

export const useCycleCountLogic = (taskId: string | undefined) => {
  const { data: assets = [], isLoading } = useAssets();
  const { data: tempAssets = [] } = useTempAssets();
  const { data: cycleCountItems = [] } = useCycleCountItems(taskId);
  const { data: locations = [] } = useLocations();
  const createCycleCountItem = useCreateCycleCountItem();
  const createTempAsset = useCreateTempAsset();
  const updateTask = useUpdateCycleCountTask();
  const { data: currentTask } = useCycleCountTaskById(taskId);
  const { user } = useAuth();
  
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
    // Auto-start task on first scan activity
    if (!hasStarted && !currentTask?.started_at && currentTask && taskId) {
      try {
        await updateTask.mutateAsync({
          id: taskId,
          updates: {
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

    const asset = assets.find(a => a.barcode === barcode);
    
    if (asset) {
      // Check if already scanned
      const existingItem = cycleCountItems.find(item => item.asset_id === asset.id);
      if (existingItem) {
        toast({
          title: "Already Counted",
          description: `${asset.name} has already been counted.`,
          variant: "default",
        });
      } else {
        // Find the asset's location name for expected_location
        const assetLocation = locations.find(loc => loc.id === asset.location);
        const expectedLocationName = assetLocation?.name || null;
        
        // Create cycle count item with proper location names
        createCycleCountItem.mutate({
          task_id: taskId!,
          asset_id: asset.id,
          expected_location: expectedLocationName, // Asset's master location name
          actual_location: currentTaskLocation === 'All locations' ? null : currentTaskLocation, // Task's location name
          status: 'counted',
          counted_by: currentUserId,
          counted_at: new Date().toISOString(),
        });
        toast({
          title: "Asset Counted",
          description: `${asset.name} has been successfully counted.`,
          variant: "default",
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
    // For now, we'll handle location as null since location_filter might be a string
    // This needs to be updated to properly handle location UUIDs
    createTempAsset.mutate({
      description: data.description,
      model: data.model || undefined,
      build: data.build || undefined,
      location_id: null, // TODO: Handle location properly with UUID
      barcode: tempTagNumber,
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

  const handleAssetToggle = (itemId: string) => {
    // This function is no longer needed as we don't toggle assets
    // Items are only created when scanned
    console.log('Asset toggle not implemented for cycle count items');
  };

  const handleCompleteTask = async () => {
    if (!currentTask || !taskId) return;
    
    try {
      await updateTask.mutateAsync({
        id: taskId,
        updates: {
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

  const assetsWithStatus = useMemo(() => {
    let filteredAssets = assets;
    
    // Apply task location filter using location ID
    if (currentTask?.location_filter) {
      filteredAssets = assets.filter(asset => 
        asset.location === currentTask.location_filter
      );
    }
    
    return filteredAssets;
  }, [assets, currentTask?.location_filter, locations]);

  const scannedItems = cycleCountItems.filter(item => item.asset);
  const filteredTempAssets = tempAssets;

  const filteredScannedItems = scannedItems.filter(item =>
    item.asset?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.asset?.barcode && item.asset?.barcode.includes(searchTerm))
  );

  return {
    // State
    showScanner,
    setShowScanner,
    manualBarcode,
    setManualBarcode,
    searchTerm,
    setSearchTerm,
    showCompletionSummary,
    
    // Data
    currentTask,
    currentTaskLocation,
    isLoading,
    assetsWithStatus,
    scannedItems,
    filteredTempAssets,
    filteredScannedItems,
    hasStarted,
    
    // Handlers
    handleScanSuccess,
    handleManualEntry,
    handleCreateTempAsset,
    handleAssetToggle,
    handleCompleteTask,
  };
};