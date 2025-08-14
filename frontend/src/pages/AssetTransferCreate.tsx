import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocations } from "@/hooks/useLocations";
import { useEffect } from "react";
import { fastapiClient } from "@/integrations/fastapi/client";
import { useAuth } from "@/contexts/FastAPIAuthContext";

const AssetTransferCreate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: locationsData = { items: [], total: 0 } } = useLocations();
  const locations = locationsData.items || [];
  const [sourceBranch, setSourceBranch] = useState("");
  const [destinationBranch, setDestinationBranch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [assetBarcodes, setAssetBarcodes] = useState<string[]>([]);
  const [scannedAssets, setScannedAssets] = useState<{ barcode: string; name: string }[]>([]);
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const totalPages = Math.ceil(scannedAssets.length / pageSize);
  const [photos, setPhotos] = useState<File[]>([]);
  const [initiatingBranches, setInitiatingBranches] = useState<any[]>([]);
  const [destinationBranches, setDestinationBranches] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const list = await fastapiClient.getInitiatingBranches();
      setInitiatingBranches(list || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!sourceBranch) { setDestinationBranches([]); return; }
      const src = initiatingBranches.find((b) => b.id === sourceBranch);
      const countryId = src?.country?.id;
      if (countryId) {
        const list = await fastapiClient.get(`/locations/branches?country_id=${encodeURIComponent(countryId)}&bypass_access=true&limit=1000`);
        setDestinationBranches(list?.items || list || []);
      }
    })();
  }, [sourceBranch, initiatingBranches]);

  const handleAddBarcode = async () => {
    if (barcodeInput && !assetBarcodes.includes(barcodeInput)) {
      setLoadingAsset(true);
      setAssetError(null);
      try {
        // Fetch asset by barcode
        const asset = await fastapiClient.get<any>(`/assets/barcode/${encodeURIComponent(barcodeInput)}`);
        // Check for location mismatch
        if (sourceBranch) {
          const assetLoc = locations.find(loc => loc.id === asset.location);
          const assetBranchId = assetLoc?.branch_id;
          if (assetBranchId && assetBranchId !== sourceBranch) {
          // Find the asset's location name for better error message
            const assetLocationName = assetLoc?.name || asset.location;
            setAssetError(`Location mismatch! Asset "${asset.name}" is under a different branch than selected source. Asset location: "${assetLocationName}"`);
            setLoadingAsset(false);
            return;
          }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fastapiClient.createAssetTransfer({
        source_branch_id: sourceBranch,
        destination_branch_id: destinationBranch,
        barcodes: assetBarcodes,
        remarks: remarks || undefined,
        photos,
      });
      const instanceId = (res as any).instance_id;
      if (instanceId) {
        navigate(`/approvals/${instanceId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setAssetError(err.message || 'Failed to submit transfer');
    }
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
              <label className="block mb-1 font-medium">Source Branch</label>
              <select
                className="w-full border rounded p-2"
                value={sourceBranch}
                onChange={e => setSourceBranch(e.target.value)}
                required
              >
                <option value="">Select source branch</option>
                {initiatingBranches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Destination Branch</label>
              <select
                className="w-full border rounded p-2"
                value={destinationBranch}
                onChange={e => setDestinationBranch(e.target.value)}
                required
              >
                <option value="">Select destination branch</option>
                {destinationBranches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Remarks (optional)</label>
              <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Enter remarks" />
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
            <div>
              <label className="block mb-1 font-medium">Photos (optional, up to 3)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, 3);
                  setPhotos(files as File[]);
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Cancel</Button>
              <Button type="submit" disabled={!sourceBranch || !destinationBranch || assetBarcodes.length === 0}>
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