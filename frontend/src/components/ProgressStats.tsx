import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle } from "lucide-react";

interface CycleCountItemWithAsset {
  id: string;
  expected_location: string | null;
  actual_location: string | null;
  asset?: {
    id: string;
    name: string;
    barcode: string | null;
  };
}

interface ProgressStatsProps {
  scannedItems: CycleCountItemWithAsset[];
  totalExpectedAssets?: number;
}

const ProgressStats = ({ scannedItems, totalExpectedAssets = 0 }: ProgressStatsProps) => {
  const totalScanned = scannedItems.length;
  const locationMismatches = scannedItems.filter(item => 
    item.expected_location !== item.actual_location
  ).length;
  
  const completionPercentage = totalExpectedAssets > 0 ? 
    Math.round((totalScanned / totalExpectedAssets) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Scanned Items</CardTitle>
          <CheckCircle className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{totalScanned}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Location Mismatches</CardTitle>
          <AlertCircle className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{locationMismatches}</div>
        </CardContent>
      </Card>

      {/* <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionPercentage}%</div>
          <div className="w-full bg-secondary rounded-full h-2 mt-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
};

export default ProgressStats;