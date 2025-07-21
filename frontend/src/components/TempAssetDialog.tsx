import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface TempAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateAsset: (data: { description: string; model?: string; build?: string }) => void;
  currentTaskLocation: string;
}

const TempAssetDialog = ({ open, onOpenChange, onCreateAsset, currentTaskLocation }: TempAssetDialogProps) => {
  const [tempAssetForm, setTempAssetForm] = useState({
    description: '',
    model: '',
    build: '',
    barcode: '',
  });

  const handleCreate = () => {
    if (!tempAssetForm.description.trim()) {
      return;
    }

    onCreateAsset({
      description: tempAssetForm.description,
      model: tempAssetForm.model || undefined,
      build: tempAssetForm.build || undefined,
      barcode: tempAssetForm.barcode || undefined,
    });

    setTempAssetForm({ description: '', model: '', build: '', barcode:'' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Temporary Asset</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Asset Description*</Label>
            <Input
              id="description"
              placeholder="Enter asset description..."
              value={tempAssetForm.description}
              onChange={(e) => setTempAssetForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              placeholder="Enter model..."
              value={tempAssetForm.model}
              onChange={(e) => setTempAssetForm(prev => ({ ...prev, model: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="build">Build</Label>
            <Input
              id="build"
              placeholder="Enter build..."
              value={tempAssetForm.build}
              onChange={(e) => setTempAssetForm(prev => ({ ...prev, build: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={currentTaskLocation}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="build">Build</Label>
            <Input
              id="barcode"
              placeholder="Barcode..."
              value={tempAssetForm.barcode}
              onChange={(e) => setTempAssetForm(prev => ({ ...prev, barcode: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            Create Asset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TempAssetDialog;