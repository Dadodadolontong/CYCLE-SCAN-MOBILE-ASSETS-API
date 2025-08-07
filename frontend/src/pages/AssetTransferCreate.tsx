import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocations } from "@/hooks/useLocations";
import { useEffect } from "react";
import { fastapiClient } from "@/integrations/fastapi/client";

const AssetTransferCreate = () => {
  const navigate = useNavigate();
  const { data: locationsData = { items: [], total: 0 } } = useLocations();
  const locations = locationsData.items || [];
  const [sourceLocation, setSourceLocation] = useState("");
  const [destinationLocation, setDestinationLocation] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [assetBarcodes, setAssetBarcodes] = useState<string[]>([]);
  const [scannedAssets, setScannedAssets] = useState<{ barcode: string; name: string }[]>([]);
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const totalPages = Math.ceil(scannedAssets.length / pageSize);

  const handleAddBarcode = async () => {
    if (barcodeInput && !assetBarcodes.includes(barcodeInput)) {
      setLoadingAsset(true);
      setAssetError(null);
      try {
        // Fetch asset by barcode
        const asset = await fastapiClient.get<any>(`/assets/barcode/${encodeURIComponent(barcodeInput)}`);
        // Check for location mismatch
        if (sourceLocation && asset.location !== sourceLocation) {
          // Find the asset's location name for better error message
          const assetLocationName = locations.find(loc => loc.id === asset.location)?.name || asset.location;
          const sourceLocationName = locations.find(loc => loc.id === sourceLocation)?.name || sourceLocation;
          
          setAssetError(`Location mismatch! Asset "${asset.name}" is located at "${assetLocationName}" but you're scanning from "${sourceLocationName}". Please verify the asset location.`);
          setLoadingAsset(false);
          return;
        }
        
        setAssetBarcodes([...assetBarcodes, barcodeInput]);
        setScannedAssets([...scannedAssets, { barcode: barcodeInput, name: asset.name || "Unknown Asset" }]);
        setBarcodeInput("");
      } catch (err: any) {
        setAssetError("Asset not found");
      } finally {
        setLoadingAsset(false);
      }
    }
};

  const handleRemoveBarcode = (barcode: string) => {
    setAssetBarcodes(assetBarcodes.filter(b => b !== barcode));
    setScannedAssets(scannedAssets.filter(a => a.barcode !== barcode));
  };

  const handleCheckboxChange = (barcode: string, checked: boolean) => {
    setSelectedBarcodes(checked
      ? [...selectedBarcodes, barcode]
      : selectedBarcodes.filter(b => b !== barcode)
    );
  };

  const handleRemoveSelected = () => {
    setAssetBarcodes(assetBarcodes.filter(b => !selectedBarcodes.includes(b)));
    setScannedAssets(scannedAssets.filter(a => !selectedBarcodes.includes(a.barcode)));
    setSelectedBarcodes([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with backend
    alert("Transfer request submitted! (not yet integrated)");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-2xl p-6">
        <CardHeader>
          <CardTitle>Create Asset Transfer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block mb-1 font-medium">Source Location</label>
              <select
                className="w-full border rounded p-2"
                value={sourceLocation}
                onChange={e => setSourceLocation(e.target.value)}
                required
              >
                <option value="">Select source location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Destination Location</label>
              <select
                className="w-full border rounded p-2"
                value={destinationLocation}
                onChange={e => setDestinationLocation(e.target.value)}
                required
              >
                <option value="">Select destination location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Asset Barcodes</label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Scan or enter barcode"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddBarcode())}
                  disabled={loadingAsset}
                />
                <Button type="button" onClick={handleAddBarcode} disabled={loadingAsset}>Add</Button>
              </div>
              {assetError && <div className="text-red-500 text-sm mb-2">{assetError}</div>}
              {loadingAsset && <div className="text-muted-foreground text-sm mb-2">Loading asset...</div>}
              <ul className="list-disc pl-5">
                {scannedAssets.slice((page - 1) * pageSize, page * pageSize).map(asset => (
                  <li key={asset.barcode} className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedBarcodes.includes(asset.barcode)}
                      onChange={e => handleCheckboxChange(asset.barcode, e.target.checked)}
                      className="mr-2"
                    />
                    <span className="font-mono">{asset.barcode}</span>
                    <span className="text-muted-foreground">{asset.name}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveSelected}
                  disabled={selectedBarcodes.length === 0}
                >
                  Remove Selected
                </Button>
                <span className="ml-4 text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages || totalPages === 0}
                >
                  Next
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Cancel</Button>
              <Button type="submit" disabled={!sourceLocation || !destinationLocation || assetBarcodes.length === 0}>
                Submit Transfer Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssetTransferCreate; 