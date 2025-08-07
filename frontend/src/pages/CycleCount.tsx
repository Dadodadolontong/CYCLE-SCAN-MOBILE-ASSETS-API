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
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AssetList from "@/components/AssetList";
import { useAssets } from "@/hooks/useAssets";
import { useLocations } from "@/hooks/useLocations";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUsersWithRoles } from "@/hooks/useUserAssignments";

interface CycleCountItemWithAsset extends Record<string, any> {
  id: string;
  expected_location: string | null;
  actual_location: string | null;
  status: string;
  counted_at: string | null;
  notes: string | null;
  asset?: {
    id: string;
    name: string;
    barcode: string | null;
    category: string | null;
    location?: string | null;
    last_seen?: string | null;
    // Add other asset fields as needed
  };
}

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

    hasStarted,
    handleScanSuccess,
    handleManualEntry,
    handleCreateTempAsset,
    handleAssetToggle,
    handleCompleteTask,
    useAssetCount,
    tempAssets,
  } = useCycleCountLogic(taskId);

  const locationId = currentTask?.location_filter;
  const category = currentTask && 'category_filter' in currentTask ? String(currentTask.category_filter) : undefined;
  const { data: totalAssetCount = 0 } = useAssetCount(locationId, category);

  const { data: locationsData = { items: [], total: 0 } } = useLocations();
  const locations = locationsData.items || [];
  const locationIdToName = Object.fromEntries(locations.map(loc => [loc.id, loc.name]));

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [countedPage, setCountedPage] = useState(1);
  const [missingPage, setMissingPage] = useState(1);
  const [temporaryPage, setTemporaryPage] = useState(1);
  const itemsPerPage = 20;

  // No need to join asset details in the frontend; backend now provides 'asset' in each scannedItem
  const scannedItemsWithAssets: CycleCountItemWithAsset[] = scannedItems as unknown as CycleCountItemWithAsset[]; // Already includes asset

  // Optionally, filter by search term on asset name/barcode
  const filteredScannedItemsWithAssets = scannedItemsWithAssets.filter(item => {
    const name = item.asset?.name?.toLowerCase() || '';
    const barcode = item.asset?.barcode || '';
    return name.includes(searchTerm.toLowerCase()) || barcode.includes(searchTerm);
  });

  // Filter temp assets for this task
  const filteredTempAssets = tempAssets.filter(
    asset => asset.cycle_count_task_id === currentTask?.id
  );

  const navigate = useNavigate();
  const { data: usersWithRoles = [] } = useUsersWithRoles();
  const assignedUser = usersWithRoles.find(user => user.id === currentTask?.assigned_to);
  const assignedToName = assignedUser?.display_name || undefined;

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

  if (showCompletionSummary || currentTask.status === 'completed') {

    // 2. Build countedAssets with location mismatch tagging
    const countedAssets = scannedItemsWithAssets
      .filter(item => item.status === 'counted') // Only include actually counted items
      .map(item => ({
        id: item.asset?.id || '',
        name: item.asset?.name || 'Unknown Asset',
        barcode: item.asset?.barcode || null,
        location: item.actual_location ? (locationIdToName[item.actual_location] || item.actual_location) : null,
        category: item.asset?.category || null,
        status: 'counted' as const,
        last_seen: item.asset?.last_seen || null,
        hasLocationMismatch: item.expected_location !== item.actual_location,
        expectedLocation: item.expected_location
      }));

    // 3. Build missingAssets from scannedItemsWithAssets with status === 'missing'
    const missingAssets = scannedItemsWithAssets
      .filter(item => item.status === 'missing') // Only include items marked as missing
      .map(item => ({
        id: item.asset?.id || '',
        name: item.asset?.name || 'Unknown Asset',
        barcode: item.asset?.barcode || null,
        location: item.expected_location ? (locationIdToName[item.expected_location] || item.expected_location) : null,
        category: item.asset?.category || null,
        status: 'missing' as const,
        last_seen: item.asset?.last_seen || null,
        expectedLocation: item.expected_location
      }));
    

    // 4. Use filteredTempAssets for tempAssets, mapping location to name
    const tempAssetsWithLocationName = filteredTempAssets.map(asset => ({
      ...asset,
      location: asset.location ? (locationIdToName[asset.location] || asset.location) : null,
      name: asset.description, // for AssetList compatibility
      category: 'Temporary',
    }));

    // Paginate each category
    const paginatedCountedAssets = countedAssets.slice(
      (countedPage - 1) * itemsPerPage,
      countedPage * itemsPerPage
    );

    const paginatedMissingAssets = missingAssets.slice(
      (missingPage - 1) * itemsPerPage,
      missingPage * itemsPerPage
    );

    const paginatedTempAssets = tempAssetsWithLocationName.slice(
      (temporaryPage - 1) * itemsPerPage,
      temporaryPage * itemsPerPage
    );



    const handleExportToCSV = () => {
      const startDate = currentTask.started_at ? new Date(currentTask.started_at).toLocaleString() : "";
      const completeDate = currentTask.completed_at ? new Date(currentTask.completed_at).toLocaleString() : "";
      const rows = [
        [
          "Task Name", "Assigned To", "Start Date", "Complete Date", "Barcode", "Name", "Expected Location", "Actual Location", "Status"
        ],
        ...countedAssets.map(asset => [
          currentTask.name,
          assignedToName,
          startDate,
          completeDate,
          asset.barcode,
          asset.name,
          asset.expectedLocation || "",
          asset.location || "",
          asset.hasLocationMismatch ? "misplaced" : "counted"
        ]),
        ...missingAssets.map(asset => [
          currentTask.name,
          assignedToName,
          startDate,
          completeDate,
          asset.barcode,
          asset.name,
          asset.location || "",
          "",
          "missing"
        ]),
        ...tempAssetsWithLocationName.map(asset => [
          currentTask.name,
          assignedToName,
          startDate,
          completeDate,
          asset.barcode,
          asset.name,
          asset.location || "",
          asset.location || "",
          "temp"
        ])
      ];
      const csvContent = rows.map(row => row.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentTask.name.replace(/\s+/g, "_")}_summary.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button
              variant="outline"
              className="mb-4 ml-2"
              onClick={handleExportToCSV}
            >
              Export to CSV
            </Button>
            <div className="flex items-center space-x-3 mb-4">
              <h1 className="text-3xl font-bold text-foreground">
                Task Completed
              </h1>
              <span className="text-muted-foreground">{currentTask.name}</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div><strong>Location:</strong> {currentTaskLocation}</div>
              <div><strong>Status:</strong> {currentTask.status}</div>
                {currentTask && 'category_filter' in currentTask && <div><strong>Category:</strong> {String(currentTask.category_filter)}</div>}
            </div>
          </div>
          <Tabs defaultValue="counted" className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="counted">Counted ({countedAssets.length})</TabsTrigger>
              <TabsTrigger value="missing">Missing ({missingAssets.length})</TabsTrigger>
              <TabsTrigger value="temporary">Temporary ({tempAssetsWithLocationName.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="counted" className="mt-4">
              <AssetList assets={paginatedCountedAssets} onAssetToggle={() => {}} />
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={countedPage === 1}
                  onClick={() => setCountedPage(countedPage - 1)}
                >
                  Previous
                </Button>
                <span className="mx-2 flex items-center">
                  Page {countedPage} of {Math.ceil(countedAssets.length / itemsPerPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={countedPage * itemsPerPage >= countedAssets.length}
                  onClick={() => setCountedPage(countedPage + 1)}
                >
                  Next
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="missing" className="mt-4">
              <AssetList assets={paginatedMissingAssets} onAssetToggle={() => {}} />
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={missingPage === 1}
                  onClick={() => setMissingPage(missingPage - 1)}
                >
                  Previous
                </Button>
                <span className="mx-2 flex items-center">
                  Page {missingPage} of {Math.ceil(missingAssets.length / itemsPerPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={missingPage * itemsPerPage >= missingAssets.length}
                  onClick={() => setMissingPage(missingPage + 1)}
                >
                  Next
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="temporary" className="mt-4">
              <AssetList assets={paginatedTempAssets} onAssetToggle={() => {}} />
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={temporaryPage === 1}
                  onClick={() => setTemporaryPage(temporaryPage - 1)}
                >
                  Previous
                </Button>
                <span className="mx-2 flex items-center">
                  Page {temporaryPage} of {Math.ceil(tempAssetsWithLocationName.length / itemsPerPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={temporaryPage * itemsPerPage >= tempAssetsWithLocationName.length}
                  onClick={() => setTemporaryPage(temporaryPage + 1)}
                >
                  Next
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  const canComplete = (hasStarted || currentTask.started_at) && currentTask.status !== 'completed';

  const paginatedScannedItems = filteredScannedItemsWithAssets.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-4xl">
          <CycleCountHeader
            taskName={currentTask.name}
            taskLocation={currentTaskLocation}
            assignedToName={assignedToName}
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
            scannedItems={paginatedScannedItems}
            tempAssets={filteredTempAssets}
          />

          <div className="flex justify-end mt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >Previous</Button>
            <span className="mx-2">Page {page} of {Math.ceil(filteredScannedItemsWithAssets.length / pageSize)}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * pageSize >= filteredScannedItemsWithAssets.length}
              onClick={() => setPage(page + 1)}
            >Next</Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CycleCount;