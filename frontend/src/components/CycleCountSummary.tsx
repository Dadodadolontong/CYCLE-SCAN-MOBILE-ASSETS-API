import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AssetList, { Asset } from "@/components/AssetList";
import { TempAsset } from "@/hooks/useTempAssets";

interface CycleCountSummaryProps {
  taskName: string;
  countedAssets: Asset[];
  missingAssets: Asset[];
  tempAssets: TempAsset[];
}

const CycleCountSummary = ({ taskName, countedAssets, missingAssets, tempAssets }: CycleCountSummaryProps) => {
  const navigate = useNavigate();

  const locationMismatchCount = countedAssets.filter(asset => asset.hasLocationMismatch).length;

  const transformedTempAssets = tempAssets.map(a => ({ 
    ...a, 
    name: a.description,
    category: 'Temporary',
    status: 'counted' as const 
  }));

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
          
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="h-8 w-8 text-success" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Task Completed</h1>
              <p className="text-muted-foreground">{taskName}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-success">{countedAssets.length}</div>
                  <div className="text-sm text-muted-foreground">Counted</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-warning">{missingAssets.length}</div>
                  <div className="text-sm text-muted-foreground">Missing</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-destructive">{locationMismatchCount}</div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Location Mismatches
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{tempAssets.length}</div>
                  <div className="text-sm text-muted-foreground">Temp Assets</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Counted Assets ({countedAssets.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <AssetList assets={countedAssets} onAssetToggle={() => {}} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Missing Assets ({missingAssets.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <AssetList assets={missingAssets} onAssetToggle={() => {}} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Temporary Assets ({tempAssets.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <AssetList assets={transformedTempAssets} onAssetToggle={() => {}} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CycleCountSummary;