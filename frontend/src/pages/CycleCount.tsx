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
    assetsWithStatus,
    scannedItems,
    filteredTempAssets,
    filteredScannedItems,
    hasStarted,
    handleScanSuccess,
    handleManualEntry,
    handleCreateTempAsset,
    handleAssetToggle,
    handleCompleteTask,
  } = useCycleCountLogic(taskId);

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
    // Convert scanned items to assets format for summary
    const countedAssets = scannedItems.map(item => ({
      id: item.asset?.id || item.id,
      name: item.asset?.name || 'Unknown Asset',
      barcode: item.asset?.barcode || null,
      location: item.expected_location,
      actualLocation: item.actual_location,
      category: item.asset?.category || null,
      status: 'counted' as const,
      hasLocationMismatch: item.expected_location !== item.actual_location
    }));

    return (
      <CycleCountSummary
        taskName={currentTask.name}
        countedAssets={countedAssets}
        missingAssets={[]}
        tempAssets={filteredTempAssets}
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

          <ProgressStats scannedItems={scannedItems} totalExpectedAssets={assetsWithStatus.length} />

          <CycleCountActions
            manualBarcode={manualBarcode}
            setManualBarcode={setManualBarcode}
            onManualEntry={handleManualEntry}
            onScanBarcode={() => setShowScanner(true)}
            onCreateTempAsset={handleCreateTempAsset}
            currentTaskLocation={currentTaskLocation}
          />

          <CycleCountTabs
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            scannedItems={filteredScannedItems}
            tempAssets={filteredTempAssets}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CycleCount;