import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Clock } from "lucide-react";
import { type TempAsset } from "@/hooks/useTempAssets";

interface TempAssetsListProps {
  assets: TempAsset[];
}

const TempAssetsList = ({ assets }: TempAssetsListProps) => {
  if (assets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No temporary assets created yet. Use the "+" button to add temporary assets.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assets.map((asset) => (
        <Card key={asset.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                {asset.description}
              </CardTitle>
              <Badge variant="outline">
                Temporary
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Tag Number</p>
                <p className="font-mono">{asset.barcode}</p>
              </div>
              
              {asset.model && (
                <div>
                  <p className="text-muted-foreground">Model</p>
                  <p>{asset.model}</p>
                </div>
              )}
            </div>

            {asset.build && (
              <div className="text-sm">
                <p className="text-muted-foreground">Build</p>
                <p>{asset.build}</p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Created: {new Date(asset.created_at).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TempAssetsList;