import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

export interface Asset {
  id: string;
  name: string;
  barcode: string | null;
  location: string | null;
  actualLocation?: string | null;
  category: string | null;
  status: 'pending' | 'counted' | 'missing';
  last_seen?: string | null;
  hasLocationMismatch?: boolean;
  erp_location_id?: string | null;
}

interface AssetListProps {
  assets: Asset[];
  onAssetToggle: (assetId: string) => void;
}

const AssetList = ({ assets, onAssetToggle }: AssetListProps) => {
  const getStatusBadge = (status: Asset['status']) => {
    switch (status) {
      case 'counted':
        return <Badge className="bg-success text-success-foreground">Counted</Badge>;
      case 'missing':
        return <Badge className="bg-warning text-warning-foreground">Missing</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      {assets.map((asset) => (
        <Card key={asset.id} className={`p-4 bg-card ${asset.hasLocationMismatch ? 'border-warning' : ''}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Checkbox
                checked={asset.status === 'counted'}
                onCheckedChange={() => onAssetToggle(asset.id)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-card-foreground truncate">
                    {asset.name}
                  </h4>
                  {asset.hasLocationMismatch && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Location Mismatch
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  {asset.barcode || 'No barcode'}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  {asset.hasLocationMismatch ? (
                    <>
                      <span className="text-sm text-muted-foreground">
                        Found: {asset.location || 'No location'}
                      </span>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-warning">
                        Expected: {asset.expectedLocation || 'No location'}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {asset.location || 'No location'}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    {asset.category || 'No category'}
                  </span>
                </div>
                {asset.last_seen && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last seen: {new Date(asset.last_seen).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="ml-3 flex-shrink-0">
              {getStatusBadge(asset.status)}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default AssetList;