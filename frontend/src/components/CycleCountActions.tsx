import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Camera, Plus } from "lucide-react";
import TempAssetDialog from './TempAssetDialog';

interface CycleCountActionsProps {
  manualBarcode: string;
  setManualBarcode: (value: string) => void;
  onManualEntry: () => void;
  onScanBarcode: () => void;
  onCreateTempAsset: (data: { description: string; model?: string; build?: string }) => void;
  currentTaskLocation: string;
}

const CycleCountActions = ({ 
  manualBarcode, 
  setManualBarcode, 
  onManualEntry, 
  onScanBarcode,
  onCreateTempAsset,
  currentTaskLocation
}: CycleCountActionsProps) => {
  const [showTempAssetDialog, setShowTempAssetDialog] = useState(false);

  const handleCreateTempAsset = (data: { description: string; model?: string; build?: string }) => {
    onCreateTempAsset(data);
    setShowTempAssetDialog(false);
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex space-x-2">
        <Input
          placeholder="Enter barcode manually..."
          value={manualBarcode}
          onChange={(e) => setManualBarcode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onManualEntry()}
          className="flex-1"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onManualEntry} variant="outline">
              Add
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add asset to count list</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onScanBarcode} variant="outline">
              <Camera className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Scan barcode using your camera</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={() => setShowTempAssetDialog(true)} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add temporary asset</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <TempAssetDialog
        open={showTempAssetDialog}
        onOpenChange={setShowTempAssetDialog}
        onCreateAsset={handleCreateTempAsset}
        currentTaskLocation={currentTaskLocation}
      />
    </div>
  );
};

export default CycleCountActions;