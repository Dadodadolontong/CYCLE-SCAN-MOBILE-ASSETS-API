import { Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import BarcodeScanner from "@/components/BarcodeScanner";
import ProgressStats from "@/components/ProgressStats";
import CycleCountHeader from "@/components/CycleCountHeader";
import CycleCountActions from "@/components/CycleCountActions";
import CycleCountTabs from "@/components/CycleCountTabs";
import CycleCountSummary from "@/components/CycleCountSummary";
import { useCycleCountLogic } from "@/hooks/useCycleCountLogic";

const CycleCount = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const {
    showScanner,
    setShowScanner,
    manualBarcode,
    setManualBarcode,
    searchTerm,
    setSearchTerm,
    showCompletionSummary,
    currentTask,
    currentTaskLocation,
    isLoading,
    scannedItems,
    scannedAssets,
    filteredScannedAssets,
    hasStarted,
    handleScanSuccess,
    handleManualEntry,
    handleCreateTempAsset,
    handleAssetToggle,
    handleCompleteTask,
    useAssetCount,
    tempAssets,
  } = useCycleCountLogic(taskId);

  const locationId = currentTask?.location_filter || undefined;
  const category = currentTask && 'category_filter' in currentTask ? currentTask.category_filter : undefined;
  const { data: totalAssetCount = 0 } = useAssetCount(locationId, category);

  // Join asset details to each scanned item
  const scannedItemsWithAssets = scannedItems.map(item => ({
    ...item,
    asset: scannedAssets.find(asset => asset.id === item.asset_id),
  }));

  // Optionally, filter by search term on asset name/barcode
  const filteredScannedItemsWithAssets = scannedItemsWithAssets.filter(item => {
    const name = item.asset?.name?.toLowerCase() || '';
    const barcode = item.asset?.barcode || '';
    return name.includes(searchTerm.toLowerCase()) || barcode.includes(searchTerm);
  });

  // Filter temp assets for this task
  const filteredTempAssets = tempAssets.filter(
    asset => asset.cycle_count_task_id === currentTask.id
  );

  if (isLoading || !currentTask) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading task...</span>
        </div>
      </div>
    );
  }

  if (showScanner) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <BarcodeScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      </div>
    );
  }

  if (showCompletionSummary) {
    // Convert scanned assets to summary format
    const countedAssets = (scannedAssets || []).map(asset => ({
      id: asset.id,
      name: asset.name || 'Unknown Asset',
      barcode: asset.barcode || null,
      location: asset.location || null,
      category: asset.category || null,
      status: 'counted' as const,
      last_seen: asset.last_seen || null,
      // Add any other required Asset fields with defaults
    }));
    return (
      <CycleCountSummary
        taskName={currentTask.name}
        countedAssets={countedAssets}
        missingAssets={[]}
        tempAssets={[]}
      />
    );
  }

  const canComplete = (hasStarted || currentTask.started_at) && currentTask.status !== 'completed';

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-4xl">
          <CycleCountHeader
            taskName={currentTask.name}
            taskLocation={currentTaskLocation}
            canComplete={canComplete}
            onComplete={handleCompleteTask}
          />

          <ProgressStats scannedItems={scannedItemsWithAssets} totalExpectedAssets={totalAssetCount} />

          <CycleCountActions
            manualBarcode={manualBarcode}
            setManualBarcode={setManualBarcode}
            onManualEntry={handleManualEntry}
            onScanBarcode={() => setShowScanner(true)}
            onCreateTempAsset={handleCreateTempAsset}
            currentTaskLocation={currentTaskLocation}
            // Remove tempAssets and scannedItems if not expected by props
          />

          <CycleCountTabs
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            scannedItems={filteredScannedItemsWithAssets}
            tempAssets={filteredTempAssets}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CycleCount;